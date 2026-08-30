-- Lifecycle nudge emails + discount A/B/C experiment
--
-- 1. Widens actions_type_check to cover the new lifecycle-email log types AND the two
--    reminder types that have been failing silently since they were introduced
--    (send-expiration-reminder-email logs 'renewal_reminder_sent'/'expiration_reminder_sent',
--    neither of which was ever added to the constraint, so every insert has been rejected).
-- 2. Adds discount experiment assignment columns to profiles.
-- 3. Schedules the two new nudge functions on pg_cron.

-- ---------------------------------------------------------------------------
-- 1. actions.type constraint
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."actions" DROP CONSTRAINT IF EXISTS "actions_type_check";

ALTER TABLE "public"."actions" ADD CONSTRAINT "actions_type_check" CHECK (
  "type" = ANY (ARRAY[
    'analysis'::"text",
    'delete'::"text",
    'unsubscribe'::"text",
    'create_filter'::"text",
    'modify_label'::"text",
    'view'::"text",
    'premium_attempt'::"text",
    'preview'::"text",
    'delete_with_exceptions'::"text",
    'mark_as_read'::"text",
    'premium_upsell_email_sent'::"text",
    -- previously missing: these have been silently failing to insert
    'renewal_reminder_sent'::"text",
    'expiration_reminder_sent'::"text",
    -- new lifecycle nudges
    'activation_nudge_sent'::"text",
    'paywall_nudge_sent'::"text",
    -- discount experiment
    'discount_experiment_exposure'::"text"
  ])
);

-- ---------------------------------------------------------------------------
-- 2. Discount experiment assignment
-- ---------------------------------------------------------------------------
-- Variant is derived deterministically from user_id in the client (see
-- src/lib/discountExperiment.ts) so a user always lands in the same bucket even
-- if this write fails. We persist it anyway so results are queryable in SQL and
-- so historical assignment survives any future change to the bucketing function.
ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "discount_variant" "text",
  ADD COLUMN IF NOT EXISTS "discount_variant_assigned_at" timestamp with time zone;

ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_discount_variant_check";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_discount_variant_check" CHECK (
  "discount_variant" IS NULL OR "discount_variant" = ANY (ARRAY[
    'control'::"text",   -- EARLYBIRD50, 50% off  (status quo)
    'none'::"text",      -- no discount offered
    'early25'::"text"    -- EARLY25, 25% off
  ])
);

CREATE INDEX IF NOT EXISTS "profiles_discount_variant_idx"
  ON "public"."profiles" ("discount_variant")
  WHERE "discount_variant" IS NOT NULL;

COMMENT ON COLUMN "public"."profiles"."discount_variant" IS
  'Discount experiment bucket, assigned on first paywall exposure. See docs/experiments/2026-08-discount-ab-test.md';

-- ---------------------------------------------------------------------------
-- 3. Cron schedules for the nudge emails
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA "extensions";

-- Both nudges look at a rolling 24h-72h window, so running once daily is enough.
-- Staggered so they do not contend for the same Resend rate budget.
SELECT cron.unschedule('send-activation-nudge-email')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-activation-nudge-email');

SELECT cron.schedule(
  'send-activation-nudge-email',
  '0 17 * * *',  -- 17:00 UTC = 10am PT
  $$
  SELECT net.http_post(
    url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-activation-nudge-email',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.unschedule('send-paywall-nudge-email')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-paywall-nudge-email');

SELECT cron.schedule(
  'send-paywall-nudge-email',
  '30 17 * * *',  -- 17:30 UTC = 10:30am PT
  $$
  SELECT net.http_post(
    url := 'https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-paywall-nudge-email',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- ---------------------------------------------------------------------------
-- 4. Aggregate stats for the paywall nudge email
-- ---------------------------------------------------------------------------
-- Computed in the database on purpose. Doing this over PostgREST from the edge
-- function silently truncated at the default 1000-row page limit and understated
-- the total by roughly 4x. An aggregate cannot be half-read.
CREATE OR REPLACE FUNCTION "public"."get_mailmop_stats"()
RETURNS TABLE (total_deleted bigint, avg_per_pro_user bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deletes AS (
    SELECT a.user_id, SUM(COALESCE(a.count, 0))::bigint AS deleted
    FROM public.actions a
    WHERE a.type IN ('delete', 'delete_with_exceptions')
      AND a.status = 'completed'
    GROUP BY a.user_id
  )
  SELECT
    (SELECT COALESCE(SUM(deleted), 0)::bigint FROM deletes) AS total_deleted,
    (SELECT COALESCE(ROUND(AVG(d.deleted)), 0)::bigint
       FROM deletes d
       JOIN public.profiles p ON p.user_id = d.user_id
      WHERE p.plan = 'pro') AS avg_per_pro_user;
$$;

REVOKE ALL ON FUNCTION "public"."get_mailmop_stats"() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."get_mailmop_stats"() TO service_role;

COMMENT ON FUNCTION "public"."get_mailmop_stats"() IS
  'Aggregate deletion stats for lifecycle email copy. service_role only.';
