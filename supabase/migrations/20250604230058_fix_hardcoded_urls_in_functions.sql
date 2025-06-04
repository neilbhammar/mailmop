-- Fix hardcoded URLs and API keys in database functions
-- This migration updates functions to be more secure and flexible

-- Update the check_and_send_expiration_reminders function to remove hardcoded URL and API key
CREATE OR REPLACE FUNCTION "public"."check_and_send_expiration_reminders"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  user_record RECORD;
  days_until_expiry INTEGER;
  reminder_body JSONB;
BEGIN
  -- Find users whose pro plans expire in 7 days or less
  FOR user_record IN 
    SELECT p.user_id, p.email, p.plan_expires_at, p.cancel_at_period_end, u.raw_user_meta_data
    FROM profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE p.plan = 'pro' 
      AND p.plan_expires_at IS NOT NULL
      AND p.plan_expires_at > NOW()
      AND p.plan_expires_at <= NOW() + INTERVAL '7 days'
      AND (p.last_upsell_nudge_sent IS NULL OR p.last_upsell_nudge_sent < NOW() - INTERVAL '1 day')
  LOOP
    -- Calculate days until expiry
    days_until_expiry := EXTRACT(DAY FROM (user_record.plan_expires_at - NOW()));
    
    -- Prepare email body
    reminder_body := jsonb_build_object(
      'user', jsonb_build_object(
        'email', user_record.email,
        'user_metadata', user_record.raw_user_meta_data
      ),
      'expiration_date', user_record.plan_expires_at,
      'days_until_expiry', days_until_expiry,
      'cancel_at_period_end', COALESCE(user_record.cancel_at_period_end, true)
    );
    
    -- Note: This function should be called from the nightly-plan-check edge function instead
    -- of making HTTP calls from the database. This is a safer and more maintainable approach.
    -- For now, we'll log that a reminder should be sent.
    RAISE LOG 'Expiration reminder needed for user: % (expires in % days)', user_record.email, days_until_expiry;
    
    -- Update last reminder sent timestamp
    UPDATE profiles 
    SET last_upsell_nudge_sent = NOW()
    WHERE user_id = user_record.user_id;
    
  END LOOP;
END;
$$;

-- Update the send_premium_upsell_email_trigger function to remove hardcoded URLs
CREATE OR REPLACE FUNCTION "public"."send_premium_upsell_email_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_profile RECORD;
    response_id bigint;
    days_since_last_reminder numeric;
BEGIN
    -- Only process premium attempts for free users
    IF NEW.type = 'premium_attempt' THEN
        
        -- Get user profile to check plan and get user info
        SELECT * INTO user_profile 
        FROM profiles 
        WHERE user_id = NEW.user_id;
        
        -- Only send upsell emails to free users
        IF user_profile.plan != 'free' THEN
            RETURN NEW;
        END IF;
        
        -- Check if we've sent an upsell email recently (within 24 hours)
        IF user_profile.last_upsell_nudge_sent IS NOT NULL THEN
            days_since_last_reminder := EXTRACT(EPOCH FROM (NOW() - user_profile.last_upsell_nudge_sent)) / 86400;
            
            IF days_since_last_reminder < 1 THEN
                -- Don't send another email if we sent one in the last 24 hours
                RETURN NEW;
            END IF;
        END IF;
        
        -- Note: The actual email sending should be handled by the edge function
        -- This trigger should just log the attempt and update the timestamp
        RAISE LOG 'Premium upsell email should be sent for user: % (action: %)', user_profile.email, NEW.type;
        
        -- Update the last upsell nudge timestamp
        UPDATE profiles 
        SET last_upsell_nudge_sent = NOW()
        WHERE user_id = NEW.user_id;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add a comment explaining the migration
COMMENT ON FUNCTION "public"."check_and_send_expiration_reminders"() IS 
'Updated to remove hardcoded URLs and API keys. Email sending should be handled by edge functions.';

COMMENT ON FUNCTION "public"."send_premium_upsell_email_trigger"() IS 
'Updated to remove hardcoded URLs. Email sending should be handled by edge functions triggered by this function.';
