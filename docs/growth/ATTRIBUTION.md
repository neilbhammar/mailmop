# Search acquisition measurement

## What this release does

- Direct Google sign-in from article CTAs; existing users go to their dashboard.
- Explain the free analysis and separately confirmed cleanup on six high-intent articles.
- Correct the subscriptions troubleshooting page using Google's current help instead of unsupported fixes.
- Preserve a public entry path and coarse channel for 30 minutes in tab-scoped session storage, through the existing same-tab OAuth flow.
- Attach this context to existing action logs in `filters.acquisition`. No database migration. Existing completion statuses remain authoritative.
- Keep operational filters intact. Capture no query strings, raw referrers, search terms, email addresses, or advertising IDs.

## Measurement

Run `qualified-search.sql` read-only after rollout. Segment by landing page. Analysis success is useful first value; deletion/unsubscribe success is stronger activation. Neither a CTA click nor an action with a started/error/cancelled status is activation. Count > 0 and success/partial_success are required.

This is best-effort, same-tab, 30-minute first-touch attribution, not a person-level multi-touch model. Returning later, switching devices/tabs, disabled storage, missing referrers and long onboarding sessions can be unattributed. Tagged paid clicks are separated; untagged paid clicks cannot be perfectly identified. Google referrers are an approximation to organic traffic. GSC clicks and measured users have different units; do not divide them and call the result an exact conversion rate. Existing Umami landing sessions can serve as the visitor denominator when matched by period/channel. Validate production rows before trusting the report; the PR validates event assembly with mocks, not live inbox actions.

