-- "One free delete" experiment: server-side quota.
--
-- Lets a free user in the treatment arm delete one sender, once, however many
-- emails that sender has. See docs/experiments/2026-08-free-delete-ab-test.md
--
-- The quota deliberately lives here rather than in localStorage (as the discount
-- experiment's state does). Leaking a discount code costs a few dollars; leaking
-- unlimited free deletes gives away the product to anyone who clears site data.

ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "free_delete_used_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "free_delete_sender" "text",
  ADD COLUMN IF NOT EXISTS "free_delete_count" integer,
  ADD COLUMN IF NOT EXISTS "free_delete_variant" "text";

ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_free_delete_variant_check";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_free_delete_variant_check" CHECK (
  "free_delete_variant" IS NULL OR "free_delete_variant" = ANY (ARRAY['control'::"text", 'free_delete'::"text"])
);

COMMENT ON COLUMN "public"."profiles"."free_delete_used_at" IS
  'Set once, when a free delete STARTS. Non-null means the quota is spent. Only clearable by service_role.';

-- ---------------------------------------------------------------------------
-- Atomic consumption
-- ---------------------------------------------------------------------------
-- A single UPDATE guarded by `free_delete_used_at IS NULL` is what makes this
-- race-safe: two tabs firing at once produce exactly one row update, so exactly
-- one of them gets the freebie. Doing a SELECT-then-UPDATE from the client would
-- let both win.
--
-- auth.uid() means a caller can only ever consume their own quota, and plan =
-- 'free' means a Pro user cannot burn one by accident.
CREATE OR REPLACE FUNCTION "public"."consume_free_delete"(p_sender "text", p_count integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_rows integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Sanity check on the value we record. There is no upper bound: the free
  -- delete covers one sender's worth, however large that sender is.
  IF p_count IS NULL OR p_count <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET free_delete_used_at = now(),
         free_delete_sender  = p_sender,
         free_delete_count   = p_count
   WHERE user_id = auth.uid()
     AND plan = 'free'
     AND free_delete_used_at IS NULL;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION "public"."consume_free_delete"("text", integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."consume_free_delete"("text", integer) TO authenticated, service_role;

COMMENT ON FUNCTION "public"."consume_free_delete"("text", integer) IS
  'Atomically spends the caller''s one free delete. Returns true only if it was unused. See docs/experiments/2026-08-free-delete-ab-test.md';

-- ---------------------------------------------------------------------------
-- Prevent the obvious bypass
-- ---------------------------------------------------------------------------
-- The "Users can update their own profile safely" policy allows a user to update
-- any column not explicitly frozen, which would include clearing their own quota
-- and taking unlimited free deletes. Rather than rewrite that large policy, this
-- trigger blocks the one direction that matters: non-null back to null.
-- Privileged operators are exempt so support can reset a quota by hand (for
-- example when a delete crashed mid-run and consumed the freebie). Both checks
-- are needed and were verified against the live database: a service_role client
-- carries auth.role()='service_role' but current_user='authenticator', while an
-- admin SQL session is current_user='postgres' with auth.role() NULL. Checking
-- only one of the two locks support out of their own table.
-- NOT security definer, deliberately. Inside a SECURITY DEFINER function
-- current_user resolves to the function OWNER (postgres), not the caller, so the
-- privileged-operator exemption below would match every caller and the trigger
-- would never block anything. Verified against the live database: with SECURITY
-- DEFINER an ordinary authenticated user could clear their own quota.
CREATE OR REPLACE FUNCTION "public"."prevent_free_delete_quota_reset"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT (
       current_user IN ('postgres', 'supabase_admin', 'service_role')
       OR COALESCE(auth.role(), '') = 'service_role'
     )
     AND OLD.free_delete_used_at IS NOT NULL
     AND NEW.free_delete_used_at IS NULL THEN
    RAISE EXCEPTION 'free_delete_used_at cannot be cleared';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trigger_prevent_free_delete_quota_reset" ON "public"."profiles";
CREATE TRIGGER "trigger_prevent_free_delete_quota_reset"
  BEFORE UPDATE ON "public"."profiles"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."prevent_free_delete_quota_reset"();

-- Exposure logging for the experiment. Recorded for BOTH arms: without the
-- control arm's rows there is no denominator to compare against.
ALTER TABLE "public"."actions" DROP CONSTRAINT IF EXISTS "actions_type_check";
ALTER TABLE "public"."actions" ADD CONSTRAINT "actions_type_check" CHECK (
  "type" = ANY (ARRAY[
    'analysis'::"text", 'delete'::"text", 'unsubscribe'::"text", 'create_filter'::"text",
    'modify_label'::"text", 'view'::"text", 'premium_attempt'::"text", 'preview'::"text",
    'delete_with_exceptions'::"text", 'mark_as_read'::"text", 'premium_upsell_email_sent'::"text",
    'renewal_reminder_sent'::"text", 'expiration_reminder_sent'::"text",
    'activation_nudge_sent'::"text", 'paywall_nudge_sent'::"text",
    'discount_experiment_exposure'::"text",
    'free_delete_exposure'::"text"
  ])
);
