-- Fix search_path security vulnerability in database functions
-- This migration adds explicit search_path settings to prevent potential security attacks

-- Fix calculate_daily_stats function
CREATE OR REPLACE FUNCTION "public"."calculate_daily_stats"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public."daily_stats" (datetime, analysis_count, deletion_count, modified_count)
    SELECT 
        NOW() AT TIME ZONE 'UTC',
        COALESCE(SUM(CASE WHEN type = 'analysis' THEN count ELSE 0 END), 0) AS analysis_count,
        COALESCE(SUM(CASE WHEN type IN ('delete', 'delete_with_exceptions') THEN count ELSE 0 END), 0) AS deletion_count,
        COALESCE(SUM(CASE WHEN type IN ('delete', 'mark_as_read', 'delete_with_exceptions', 'modify_label') THEN count ELSE 0 END), 0) AS modified_count
    FROM public.actions;
END;
$$;

-- Fix check_and_send_expiration_reminders function (using latest version from 20250604230058)
CREATE OR REPLACE FUNCTION "public"."check_and_send_expiration_reminders"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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

-- Fix check_expiring_subscriptions function
CREATE OR REPLACE FUNCTION "public"."check_expiring_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql" 
    SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    profile_record RECORD;
    subscription_record RECORD;
    expiration_date TIMESTAMP;
    days_until_expiration INTEGER;
BEGIN
    -- Get all pro users with active subscriptions
    FOR profile_record IN 
        SELECT p.user_id, p.email, p.full_name, p.stripe_customer_id, p.plan
        FROM profiles p
        WHERE p.plan = 'pro'
        AND p.stripe_customer_id IS NOT NULL
        AND p.email IS NOT NULL
    LOOP
        -- Check if we've already sent a reminder for this subscription period
        -- We'll use a simple check: if we sent a reminder in the last 30 days, skip
        IF EXISTS (
            SELECT 1 
            FROM user_actions ua 
            WHERE ua.user_id = profile_record.user_id 
            AND ua.action_type IN ('expiration_reminder_sent', 'renewal_reminder_sent')
            AND ua.created_at > NOW() - INTERVAL '30 days'
        ) THEN
            RAISE LOG 'Skipping user % - reminder already sent in last 30 days', profile_record.email;
            CONTINUE;
        END IF;

        -- Make HTTP request to get subscription details from Stripe via our edge function
        -- For now, we'll simulate the subscription data - in production you'd call Stripe API
        -- This is a simplified approach - you could also store subscription data in your DB
        
        -- For this demo, let's simulate checking if user's subscription expires in 7 days
        -- In real implementation, you'd query Stripe API or store subscription data locally
        
        -- Example: simulate subscription ending 7 days from now for testing
        -- In production, you'd get this from Stripe API
        RAISE LOG 'Checking subscription for user: %', profile_record.email;
        
        -- For now, let's skip the actual Stripe API call and log that we would check
        -- You would implement the actual Stripe subscription check here
        RAISE LOG 'Would check Stripe subscription for customer: %', profile_record.stripe_customer_id;
        
    END LOOP;
    
    RAISE LOG 'Completed checking for expiring subscriptions';
END;
$$;

-- Fix send_premium_upsell_email_trigger function (using latest version from 20250604230058)
CREATE OR REPLACE FUNCTION "public"."send_premium_upsell_email_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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

-- Fix send_upgrade_thanks_email function
CREATE OR REPLACE FUNCTION "public"."send_upgrade_thanks_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" 
    SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    response_id bigint;
BEGIN
    -- Only send email when plan changes to 'pro'
    IF NEW.plan != OLD.plan AND NEW.plan = 'pro' THEN
        
        -- Call the edge function using the correct syntax
        SELECT net.http_post(
            url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-upgrade-thanks-email',
            body := jsonb_build_object(
                'type', 'UPDATE',
                'table', 'profiles',
                'record', row_to_json(NEW)::jsonb,
                'old_record', row_to_json(OLD)::jsonb
            ),
            headers := jsonb_build_object(
                'Content-Type', 'application/json'
            )
        ) INTO response_id;

        RAISE LOG 'Upgrade email HTTP request sent for user %, response ID: %', NEW.user_id, response_id;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the profile update
    RAISE LOG 'Failed to send upgrade email for user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix send_welcome_email_trigger function
CREATE OR REPLACE FUNCTION "public"."send_welcome_email_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" 
    SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    response_id bigint;
BEGIN
    -- Only send welcome email for new profile insertions
    -- This assumes profiles are created when users sign up
    IF TG_OP = 'INSERT' THEN
        
        -- Call the welcome email function
        SELECT net.http_post(
            url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-welcome-email',
            body := jsonb_build_object(
                'type', 'INSERT',
                'table', 'profiles',
                'record', row_to_json(NEW)::jsonb
            ),
            headers := jsonb_build_object(
                'Content-Type', 'application/json'
            )
        ) INTO response_id;

        RAISE LOG 'Welcome email HTTP request sent for new user %, response ID: %', NEW.user_id, response_id;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the profile creation
    RAISE LOG 'Failed to send welcome email for user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add comments explaining the security fix
COMMENT ON FUNCTION "public"."calculate_daily_stats"() IS 
'Function to calculate daily statistics. Updated with explicit search_path for security.';

COMMENT ON FUNCTION "public"."check_and_send_expiration_reminders"() IS 
'Function to check and send expiration reminders. Updated with explicit search_path for security.';

COMMENT ON FUNCTION "public"."check_expiring_subscriptions"() IS 
'Function to check expiring subscriptions. Updated with explicit search_path for security.';

COMMENT ON FUNCTION "public"."send_premium_upsell_email_trigger"() IS 
'Trigger function for premium upsell emails. Updated with explicit search_path for security.';

COMMENT ON FUNCTION "public"."send_upgrade_thanks_email"() IS 
'Trigger function for upgrade thanks emails. Updated with explicit search_path for security.';

COMMENT ON FUNCTION "public"."send_welcome_email_trigger"() IS 
'Trigger function for welcome emails. Updated with explicit search_path for security.';

COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 
'Trigger function to update updated_at column. Updated with explicit search_path for security.'; 