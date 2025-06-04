

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."calculate_daily_stats"() RETURNS "void"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."calculate_daily_stats"() OWNER TO "postgres";


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
    
    -- Send reminder email
    PERFORM net.http_post(
      url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-expiration-reminder-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjb2FjcWFsY3BxcmpycnFraXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3MDMzNDQsImV4cCI6MjA1NzI3OTM0NH0.7RBzQvEoKqnNIQcPOq_4GlLpDbqFY-KRcjbpjhgAYmo'
      ),
      body := reminder_body
    );
    
    -- Update last reminder sent timestamp
    UPDATE profiles 
    SET last_upsell_nudge_sent = NOW()
    WHERE user_id = user_record.user_id;
    
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."check_and_send_expiration_reminders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_expiring_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."check_expiring_subscriptions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_for_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_name text;
BEGIN
  -- Extract name from raw_user_meta_data (Google SSO provides 'name' or 'full_name')
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)  -- Fallback to email prefix
  );

  INSERT INTO public.profiles (user_id, email, name, plan, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    'free',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_profile_for_new_user"() OWNER TO "postgres";


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
                
                -- Call the premium upsell email function
                SELECT net.http_post(
                    url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-premium-upsell-email',
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

                RAISE LOG 'Premium upsell email HTTP request sent for user % (days since last: %), response ID: %', 
                    NEW.user_id, COALESCE(days_since_last_reminder, 0), response_id;
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


ALTER FUNCTION "public"."send_premium_upsell_email_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_upgrade_thanks_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."send_upgrade_thanks_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_welcome_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    full_name text;
    response_id bigint;
BEGIN
    -- Extract name from raw_user_meta_data 
    full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Call the edge function using the correct syntax
    SELECT net.http_post(
        url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-welcome-email',
        body := jsonb_build_object(
            'record', jsonb_build_object(
                'email', NEW.email,
                'user_metadata', jsonb_build_object(
                    'full_name', full_name
                )
            )
        ),
        headers := jsonb_build_object(
            'Content-Type', 'application/json'
        )
    ) INTO response_id;

    RAISE LOG 'Welcome email HTTP request sent for user %, response ID: %', NEW.id, response_id;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user signup
    RAISE LOG 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."send_welcome_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_welcome_email_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."send_welcome_email_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_welcome_email_with_data"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  request_id bigint;
  user_name text;
  auth_key text;
BEGIN
  -- Extract the name from raw_user_meta_data
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    'there'
  );

  -- Try to get the anon key from vault, fallback to working key
  -- In production, this should be stored in vault.secrets
  BEGIN
    SELECT decrypted_secret INTO auth_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'anon_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    auth_key := NULL;
  END;
  
  -- Fallback to the working anon key
  IF auth_key IS NULL OR auth_key = '' THEN
    auth_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjb2FjcWFsY3BxcmpycnFraXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3MDMzNDQsImV4cCI6MjA1NzI3OTM0NH0.IowS3bJYI5x-uWyKpSZQVED06XcG0c9D-DYat-tdaf4';
  END IF;

  -- Use the HTTP extension to call the edge function
  SELECT net.http_post(
    url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || auth_key
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'users',
      'record', jsonb_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'created_at', NEW.created_at,
        'user_metadata', jsonb_build_object(
          'full_name', user_name
        )
      )
    )
  ) INTO request_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."send_welcome_email_with_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."daily_stats" (
    "id" bigint NOT NULL,
    "datetime" timestamp with time zone NOT NULL,
    "analysis_count" bigint NOT NULL,
    "deletion_count" bigint NOT NULL,
    "modified_count" bigint NOT NULL
);


ALTER TABLE "public"."daily_stats" OWNER TO "postgres";


ALTER TABLE "public"."daily_stats" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Daily Stats_id_seq1"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."actions" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'started'::"text" NOT NULL,
    "count" integer DEFAULT 0,
    "filters" "jsonb",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "completed_at" timestamp without time zone,
    "end_type" "text",
    "estimated_emails" integer,
    CONSTRAINT "actions_end_type_check" CHECK ((("end_type" = ANY (ARRAY['success'::"text", 'tab_closed'::"text", 'user_stopped'::"text", 'auth_failure'::"text", 'runtime_error'::"text", 'unknown'::"text"])) OR ("end_type" IS NULL))),
    CONSTRAINT "actions_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'preparing'::"text", 'analyzing'::"text", 'deleting'::"text", 'blocking'::"text", 'unsubscribing'::"text", 'marking'::"text", 'completed'::"text", 'error'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "actions_type_check" CHECK (("type" = ANY (ARRAY['analysis'::"text", 'delete'::"text", 'unsubscribe'::"text", 'create_filter'::"text", 'modify_label'::"text", 'view'::"text", 'premium_attempt'::"text", 'preview'::"text", 'delete_with_exceptions'::"text", 'mark_as_read'::"text", 'premium_upsell_email_sent'::"text"])))
);


ALTER TABLE "public"."actions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."actions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."actions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."actions_id_seq" OWNED BY "public"."actions"."id";



CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "feedback_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_email" "text" NOT NULL,
    "resolved" boolean DEFAULT false,
    CONSTRAINT "feedback_feedback_type_check" CHECK (("feedback_type" = ANY (ARRAY['issue'::"text", 'idea'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text" NOT NULL,
    "name" "text",
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "last_login" timestamp with time zone,
    "avatar_url" "text",
    "plan_expires_at" timestamp with time zone,
    "plan_updated_at" timestamp with time zone,
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "stripe_price_id" "text",
    "cancel_at_period_end" boolean,
    "subscription_status" "text",
    "last_upsell_nudge_sent" timestamp with time zone,
    CONSTRAINT "valid_plans" CHECK (("plan" = ANY (ARRAY['free'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."plan_expires_at" IS 'If autorenew is on, this reflects the renewal date (end of period). If auto renew is off, this reflects whatever cancellation date is set in Stripe, whether that be end of period or a custom date.';



COMMENT ON COLUMN "public"."profiles"."stripe_subscription_id" IS 'Stores the active Stripe Subscription ID for this user.';



COMMENT ON COLUMN "public"."profiles"."stripe_customer_id" IS 'Stores the Stripe Customer ID associated with this user.';



COMMENT ON COLUMN "public"."profiles"."cancel_at_period_end" IS 'Doesn''t actually mean end of period, just means "Cancellation date set?"';



CREATE TABLE IF NOT EXISTS "public"."whitelist_emails" (
    "email" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "note" "text"
);


ALTER TABLE "public"."whitelist_emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."whitelist_emails" IS 'Beta whitelist table. Users can read their own email status, but only service role can modify entries.';



ALTER TABLE ONLY "public"."actions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."actions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_stats"
    ADD CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."whitelist_emails"
    ADD CONSTRAINT "whitelist_emails_pkey" PRIMARY KEY ("email");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE OR REPLACE TRIGGER "trigger_send_premium_upsell_email" AFTER INSERT ON "public"."actions" FOR EACH ROW EXECUTE FUNCTION "public"."send_premium_upsell_email_trigger"();



CREATE OR REPLACE TRIGGER "trigger_send_upgrade_thanks_email" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."send_upgrade_thanks_email"();



CREATE OR REPLACE TRIGGER "trigger_send_welcome_email" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."send_welcome_email_trigger"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow insert if user owns it" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Allow public to read all daily stats" ON "public"."daily_stats" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow select own profile" ON "public"."profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Prevent all modifications on daily_stats" ON "public"."daily_stats" TO "authenticated", "anon" USING (false);



CREATE POLICY "Service role can delete whitelist emails" ON "public"."whitelist_emails" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can do anything" ON "public"."profiles" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert whitelist emails" ON "public"."whitelist_emails" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can update whitelist emails" ON "public"."whitelist_emails" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can insert their own actions" ON "public"."actions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own feedback" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own actions" ON "public"."actions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own feedback" ON "public"."feedback" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own actions" ON "public"."actions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile safely" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND ("plan" = ( SELECT "profiles_1"."plan"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."user_id" = "auth"."uid"()))) AND (NOT ("plan_expires_at" IS DISTINCT FROM ( SELECT "profiles_1"."plan_expires_at"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."user_id" = "auth"."uid"())))) AND (NOT ("cancel_at_period_end" IS DISTINCT FROM ( SELECT "profiles_1"."cancel_at_period_end"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."user_id" = "auth"."uid"())))) AND (NOT ("plan_updated_at" IS DISTINCT FROM ( SELECT "profiles_1"."plan_updated_at"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."user_id" = "auth"."uid"())))) AND (NOT ("stripe_subscription_id" IS DISTINCT FROM ( SELECT "profiles_1"."stripe_subscription_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."user_id" = "auth"."uid"())))) AND (NOT ("stripe_customer_id" IS DISTINCT FROM ( SELECT "profiles_1"."stripe_customer_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."user_id" = "auth"."uid"())))) AND (NOT ("stripe_price_id" IS DISTINCT FROM ( SELECT "profiles_1"."stripe_price_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."user_id" = "auth"."uid"())))) AND (NOT ("subscription_status" IS DISTINCT FROM ( SELECT "profiles_1"."subscription_status"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."user_id" = "auth"."uid"()))))));



COMMENT ON POLICY "Users can update their own profile safely" ON "public"."profiles" IS 'Allows users to update their profile fields like name, email, avatar_url, last_login, but prevents modification of any plan/subscription/stripe related fields. Those can only be modified by service role or through proper API endpoints.';



CREATE POLICY "Users cannot delete their feedback" ON "public"."feedback" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "Users cannot update their feedback" ON "public"."feedback" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "Whitelist read" ON "public"."whitelist_emails" FOR SELECT USING (("email" = "auth"."email"()));



ALTER TABLE "public"."actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whitelist_emails" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_daily_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_daily_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_daily_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_send_expiration_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_send_expiration_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_send_expiration_reminders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_expiring_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_expiring_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_expiring_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_premium_upsell_email_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_premium_upsell_email_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_premium_upsell_email_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_upgrade_thanks_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_upgrade_thanks_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_upgrade_thanks_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_welcome_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_welcome_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_welcome_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_welcome_email_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_welcome_email_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_welcome_email_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_welcome_email_with_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_welcome_email_with_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_welcome_email_with_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."daily_stats" TO "anon";
GRANT ALL ON TABLE "public"."daily_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Daily Stats_id_seq1" TO "anon";
GRANT ALL ON SEQUENCE "public"."Daily Stats_id_seq1" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Daily Stats_id_seq1" TO "service_role";



GRANT ALL ON TABLE "public"."actions" TO "anon";
GRANT ALL ON TABLE "public"."actions" TO "authenticated";
GRANT ALL ON TABLE "public"."actions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."actions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."actions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."actions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT INSERT ON TABLE "public"."profiles" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."whitelist_emails" TO "anon";
GRANT ALL ON TABLE "public"."whitelist_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."whitelist_emails" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
