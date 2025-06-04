# Setting Up Environment Variables for Supabase Edge Functions

## Overview
Your edge functions have been updated to use environment variables instead of hardcoded URLs. This makes them more flexible and secure for different environments (development, staging, production).

## Required Environment Variables

### 1. App URLs
```bash
# Set your production site URL
npx supabase secrets set NEXT_PUBLIC_SITE_URL=https://mailmop.com

# Set your app URL (can be the same as site URL)
npx supabase secrets set NEXT_PUBLIC_APP_URL=https://mailmop.com
```

### 2. Email Service (Resend)
```bash
# Your Resend API key for sending emails
npx supabase secrets set RESEND_API_KEY=your_actual_resend_api_key_here
```

### 3. Stripe Configuration
```bash
# Your Stripe secret key
npx supabase secrets set STRIPE_SECRET_KEY=your_actual_stripe_secret_key_here

# Your Stripe price ID for the Pro plan
npx supabase secrets set STRIPE_PRICE_ID=your_actual_stripe_price_id_here
```

### 4. Optional: Cron Job Security
```bash
# Optional: Add a secret for securing cron job endpoints
npx supabase secrets set CRON_SECRET=your_secure_random_string_here
```

## Default Environment Variables
These are automatically available in Supabase Edge Functions:
- `SUPABASE_URL` - Your project's API URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `SUPABASE_ANON_KEY` - Anonymous key for client-side access
- `SUPABASE_DB_URL` - Direct database connection URL

## Verification
After setting the secrets, you can verify they're set correctly:
```bash
npx supabase secrets list
```

## Changes Made
The following functions have been updated to use environment variables:

1. **send-premium-upsell-email**: 
   - Uses `NEXT_PUBLIC_SITE_URL` for Stripe checkout URLs
   - Uses `SUPABASE_URL` instead of hardcoded Supabase URL

2. **send-expiration-reminder-email**:
   - Uses `NEXT_PUBLIC_APP_URL` for dashboard and renewal URLs
   - Uses `SUPABASE_URL` instead of hardcoded Supabase URL

3. **nightly-plan-check**:
   - Already using environment variables correctly

4. **send-welcome-email** and **send-upgrade-thanks-email**:
   - No hardcoded URLs found, already properly configured

## Local Development
For local development, create a `.env` file in the `supabase/functions/` directory:
```bash
# supabase/functions/.env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=your_dev_resend_key
STRIPE_SECRET_KEY=your_dev_stripe_key
STRIPE_PRICE_ID=your_dev_stripe_price_id
```

Then serve functions with:
```bash
npx supabase functions serve --env-file ./supabase/functions/.env
```

## Security Notes
- Never commit `.env` files to version control
- Use different API keys for development and production
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - only use in edge functions, never in client code 