-- Fix the premium upsell email trigger to actually send emails
-- The current version only logs but doesn't call the edge function

CREATE OR REPLACE FUNCTION "public"."send_premium_upsell_email_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_profile RECORD;
    response_id bigint;
    days_since_last_reminder numeric;
    function_url text;
BEGIN
    -- Only process premium attempts for free users
    IF NEW.type = 'premium_attempt' THEN
        
        -- Get user profile to check plan and get user info
        SELECT * INTO user_profile 
        FROM profiles 
        WHERE user_id = NEW.user_id;
        
        -- Only send upsell emails to free users
        IF user_profile.plan != 'free' THEN
            RAISE LOG 'Skipping premium upsell email for user % - already on % plan', user_profile.email, user_profile.plan;
            RETURN NEW;
        END IF;
        
        -- Check if we've sent an upsell email recently (within 24 hours)
        IF user_profile.last_upsell_nudge_sent IS NOT NULL THEN
            days_since_last_reminder := EXTRACT(EPOCH FROM (NOW() - user_profile.last_upsell_nudge_sent)) / 86400;
            
            IF days_since_last_reminder < 1 THEN
                RAISE LOG 'Skipping premium upsell email for user % - last upsell nudge sent % hours ago', 
                    user_profile.email, ROUND(days_since_last_reminder * 24, 1);
                RETURN NEW;
            END IF;
        END IF;
        
        -- Build the function URL
        function_url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-premium-upsell-email';
        
        -- Call the premium upsell email function via HTTP
        SELECT net.http_post(
            url := function_url,
            body := jsonb_build_object(
                'user_id', NEW.user_id,
                'email', user_profile.email,
                'full_name', COALESCE(user_profile.name, 'there'),
                'action_type', COALESCE(NEW.notes, 'premium_feature')
            ),
            headers := jsonb_build_object(
                'Content-Type', 'application/json'
            )
        ) INTO response_id;

        -- Update the last upsell nudge timestamp
        UPDATE profiles 
        SET last_upsell_nudge_sent = NOW()
        WHERE user_id = NEW.user_id;
        
        RAISE LOG 'Premium upsell email HTTP request sent for user % (action: %), response ID: %', 
            user_profile.email, NEW.notes, response_id;
        
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the action insert
    RAISE LOG 'Failed to send premium upsell email for user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Add comment explaining this fix
COMMENT ON FUNCTION "public"."send_premium_upsell_email_trigger"() IS 
'Fixed to actually call the send-premium-upsell-email edge function via HTTP instead of just logging. Includes proper error handling and rate limiting.'; 