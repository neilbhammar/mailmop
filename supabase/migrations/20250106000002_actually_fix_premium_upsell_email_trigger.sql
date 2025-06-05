-- Actually fix premium upsell email trigger to send emails
-- The previous migration was marked as applied during repair but never actually executed

CREATE OR REPLACE FUNCTION "public"."send_premium_upsell_email_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
        
        -- Only send if user is on free plan
        IF user_profile.plan = 'free' THEN
            
            -- Check if we need to send an upsell email based on last_upsell_nudge_sent
            IF user_profile.last_upsell_nudge_sent IS NULL THEN
                -- Never sent a reminder, send one now
                days_since_last_reminder := NULL;
            ELSE
                -- Calculate days since last reminder
                days_since_last_reminder := EXTRACT(EPOCH FROM (NOW() - user_profile.last_upsell_nudge_sent)) / (24 * 60 * 60);
            END IF;
            
            -- Send email if no previous reminder OR it's been more than 30 days
            IF user_profile.last_upsell_nudge_sent IS NULL OR days_since_last_reminder > 30 THEN
                
                -- Build the function URL (this should match your Supabase project)
                function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-premium-upsell-email';
                
                -- Fallback to project-specific URL if setting not available
                IF function_url IS NULL OR function_url = '/functions/v1/send-premium-upsell-email' THEN
                    function_url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-premium-upsell-email';
                END IF;
                
                -- Call the premium upsell email function
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

                -- Update last_upsell_nudge_sent timestamp
                UPDATE profiles 
                SET last_upsell_nudge_sent = NOW() 
                WHERE user_id = NEW.user_id;

                RAISE LOG 'Premium upsell email HTTP request sent for user % (days since last: %), response ID: %, URL: %', 
                    NEW.user_id, COALESCE(days_since_last_reminder, 0), response_id, function_url;
            ELSE
                RAISE LOG 'Skipping premium upsell email for user % - last upsell nudge sent % days ago (less than 30)', 
                    NEW.user_id, days_since_last_reminder;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the action insert
    RAISE LOG 'Failed to send premium upsell email for user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Add comment explaining this is the actual fix
COMMENT ON FUNCTION "public"."send_premium_upsell_email_trigger"() IS 
'Actually fixed to call the send-premium-upsell-email edge function via HTTP. Previous migration was marked applied but never executed.'; 