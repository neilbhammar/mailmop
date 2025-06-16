# MailMop Security Overview

Last updated: 2025-06-16

MailMop is designed from the ground up with security and privacy as first-class citizens. The guiding philosophy is **Minimise the attack surface & keep user data in the browser whenever possible**. This document is a living reference for developers and auditors who want to understand the layers of protection baked into the product.

---

## 1. Architectural Fundamentals

### 1.1 Client-First
• All Gmail API calls execute **in-browser** through Google's official `gapi` library.  
• The server never touches users' Gmail data — messages, headers, or metadata.  
• Heavy computations (search, filter, batching, local caching) run in the user's tab, eliminating server-side injection vectors.

### 1.2 Thin Backend
The backend's job is limited to:
1. Authentication (Supabase OAuth → Google)
2. Subscription management (Stripe)
3. Lightweight analytics / event logging
4. E-mail notification automation via Edge Functions

No user inbox data transits our servers.

---

## 2. Authentication & Authorization

### 2.1 Supabase Auth
• OAuth with Google → tokens stored by Supabase; MailMop receives a signed JWT.  
• Middleware verifies the JWT on every protected request (`/dashboard/**`).  
• **Refresh tokens** are stored in **httpOnly, Secure, SameSite=Lax cookies**.  
• **Access tokens** live only in volatile memory and expire in 60 min max.

### 2.2 Row-Level Security (RLS)
Every table in Postgres (Supabase) has **REQUIRED** RLS enabled.

| Table | Example Policies |
|-------|------------------|
| `profiles` | owner can select/update their row |
| `actions`  | owner can select/insert/update their actions |
| `feedback` | owner can insert/select; cannot update/delete afterwards |
| `daily_stats` | public readonly; all mutations blocked |
| `whitelist_emails` | service role writes; select constrained to `email = auth.email()` |

Policies are defined in `/supabase/migrations/*_initial_schema.sql` and follow the principle of *least privilege*.

---

## 3. Environment & Secret Management

| Secret | Location | Protection |
|--------|----------|------------|
| Supabase keys | `*.env.local` (ignored by git) | Provided at runtime by Vercel secrets |
| Stripe keys | same as above | |
| Gmail API credentials | Secured in Google Cloud & Vercel's secret store |

Safeguards
1. GitHub secret-scanning blocks pushes that contain credentials.
2. CI fails if `check-env.js` detects a missing or mis-scoped variable.
3. Periodic cron monitors unused or leaked keys → rotation.

---

## 4. Request-Level Defences (`middleware.ts`)

1. **Input validation**: blocks path traversal, `<script>` tags, SQL keywords, JS/ VBScript URLs, oversize user-agents & URLs.  
2. **Rate limiting**: 100 requests / 15 min window per IP on `/dashboard/**`.  
3. **Auth enforcement**: redirects unauthenticated users to landing page.  
4. **Security headers**
   • `Strict-Transport-Security` (prod)  
   • Content-Security-Policy – whitelisted domains only  
   • `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.

All events, successes & violations are piped to a structured logger and stored in Supabase's `logs` bucket for 30 days.

---

## 5. Input Validation & Sanitisation (Front-End)

Validation utils live in `src/lib/utils/inputValidation.ts` + `src/lib/gmail/buildQuery.ts`.

| Function | Purpose |
|----------|---------|
| `sanitizeTextInput` | Strip dangerous HTML & enforce length |
| `validateLabelName` | Gmail label rules / reserved names / 50 char limit |
| `validateFilterConditionValue` | Escapes Gmail search operators |
| `validateDateInput` | Prevent invalid or unrealistic dates |
| `escapeGmailSearchValue` | Escapes special chars before building query |

Only inputs that eventually hit Supabase or Gmail are sanitised; purely client-side search/filter remains unsanitised by design to save cycles (no data leaves browser).

---

## 6. Network & Transport Security

• All traffic terminates at HTTPS (Vercel edge).  
• HSTS max-age 1 year with sub-domains.  
• Modern TLS versions only; weak ciphers disabled by Vercel defaults.  
• Stripe elements served from `https://js.stripe.com` within strict CSP.

---

## 7. Edge Functions Security

Edge Functions run with the **service role key** in a private Supabase network:

• `verify-webhook-signature` helpers validate Stripe events.  
• Functions declare explicit `import_map` to prevent supply-chain typosquatting.  
• Each function sanitises inputs (e.g. `send-welcome-email` guards against template injection).  
• Logs emitted to Supabase's `edge_function_logs` table.

---

## 8. Monitoring, Alerting & Incident Response

1. Secret scanning (GitHub Advanced Security) – blocking.  
2. Supabase audit logs streamed to Logflare → Grafana dashboards.  
3. Vercel analytics alerts on anomalous traffic spikes (≥3× baseline).  
4. PagerDuty alert if **any** `middleware.security.error` or leaked credential is detected.  
5. 30-day retention; GDPR-compliant deletion thereafter.

---

## 9. Dependency & Build Security

• Dependabot PRs auto-created weekly; high severity patched within 24 h.  
• `npm audit` & `pnpm audit` run in CI; build fails on CVSS ≥ 7.  
• TypeScript strict mode eliminates many injection paths at compile-time.

---

## 10. Secure Coding Guidelines

Developers must:

1. Never store Gmail content on the server.
2. Use validation helpers – **do not roll your own sanitiser**.
3. Keep secrets out of source code – use `vercel env`.
4. Add a Supabase RLS policy **before** adding any new table/column.
5. Write unit tests for every new validation path (Jest + React Testing Library).

---

## 11. Change Log

See Git history of `SECURITY.md` for previous versions.

---

**Questions or security disclosures?**  
Please open a **PRIVATE** security issue or email help@mailmop.com