# Lifecycle emails

Every email MailMop sends, what triggers it, and where it lives.

## The full set

| Email | Trigger | Mechanism |
|---|---|---|
| `send-welcome-email` | `auth.users` insert | DB trigger, fires within seconds of signup |
| `send-activation-nudge-email` | Signed up 24-72h ago, never ran an analysis | pg_cron, daily 17:00 UTC |
| `send-premium-upsell-email` | A `premium_attempt` action | DB trigger, fires immediately |
| `send-paywall-nudge-email` | Hit paywall 24-72h ago, still on free | pg_cron, daily 17:30 UTC |
| `send-upgrade-thanks-email` | `profiles.plan` becomes `pro` | DB trigger |
| `send-expiration-reminder-email` | 7 days before `plan_expires_at` | Called by `nightly-plan-check` |

## The two nudges (added 2026-08-30)

### Why

Two points in the lifecycle had no email at all:

1. **Signed up, never ran an analysis.** The welcome email fires within seconds of
   signup, before anyone could have activated, and nothing followed. A meaningful
   share of new accounts never run their first analysis.
2. **Hit the paywall, did not upgrade.** The upsell email fires instantly off the
   `premium_attempt` trigger, in the same moment the user was already saying no.
   Nothing followed a day later.

### The rolling window, and why it matters

Both jobs target a **24h to 72h** window, not "everyone who ever qualified."

This is the single most important detail in these functions. A wider window would,
on first run, mail roughly 180 historical signups who never activated and ~100 users
who hit a paywall months ago. That is a deliverability incident, not a growth
campaign, and `neil@notifications.mailmop.com` would pay for it.

Anything older than 72h is permanently out of scope by design. Going forward the
window catches every new user exactly once.

### Safety rails

- `MAX_SENDS_PER_RUN = 50`. If a run ever selects more, it aborts with a 500 and
  sends nothing rather than blasting.
- Idempotency via `actions` rows (`activation_nudge_sent`, `paywall_nudge_sent`).
  Re-running a job is a no-op for anyone already mailed. Covered by tests.
- `?dry_run=true` on either function returns the recipient list and sends nothing.
- `List-Unsubscribe` headers plus a plain-language opt-out line in the body.

### Testing

Targeting logic lives in `supabase/functions/_shared/nudgeTargeting.ts`, apart from
the edge functions, because deciding *who* gets mailed is the expensive thing to get
wrong. It is pure (no clocks, no network, no Deno globals) and covered by
`nudgeTargeting.test.ts`, which runs in the normal `npx vitest run` suite via the
`supabase/functions/**/*.test.ts` include in `vitest.config.ts`.

Dry run against production:

```bash
curl -s "https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-activation-nudge-email?dry_run=true" | jq
curl -s "https://ucoacqalcpqrjrrqkizf.supabase.co/functions/v1/send-paywall-nudge-email?dry_run=true" | jq
```

### Stats in the paywall nudge

Every number in that email is computed live via the `get_mailmop_stats()` aggregate
at send time, then rounded **down** so the copy never implies false precision.

Do not replace these with estimates or round numbers that sound better. A fabricated
statistic in a customer email is a much worse problem than a slightly smaller true
one. `roundStats` is tested to never round up.

Note the aggregate runs in the database rather than summing rows in the function.
An earlier version summed over a PostgREST select and silently truncated at the
default 1000-row page limit, understating the total by roughly 4x.

## Known issue fixed here

`send-expiration-reminder-email` logs `renewal_reminder_sent` and
`expiration_reminder_sent`, neither of which was in the `actions_type_check`
constraint, so every one of those inserts has been silently rejected since the
function shipped. The email sent; the log did not. Both types are added to the
constraint in `20260830000000_lifecycle_emails_and_discount_experiment.sql`.
