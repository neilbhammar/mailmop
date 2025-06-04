# MailMop Database Migration & Environment Setup - COMPLETE ✅

## What Has Been Accomplished

### 1. Database Schema Migration Setup ✅
- **Linked Supabase CLI** to your MailMop project (`ucoacqalcpqrjrrqkizf`)
- **Created initial migrations** from your current database schema:
  - `20241201000000_initial_schema.sql` - Complete database schema
  - `20241201000001_rls_policies.sql` - Row Level Security policies  
  - `20241201000002_seed_data.sql` - Current data as seed data
  - `20250604230058_fix_hardcoded_urls_in_functions.sql` - Fixed hardcoded URLs

### 2. Edge Functions Fixed ✅
Updated all edge functions to use environment variables instead of hardcoded URLs:

#### **send-premium-upsell-email**
- ✅ Uses `NEXT_PUBLIC_SITE_URL` for Stripe checkout URLs
- ✅ Uses `SUPABASE_URL` instead of hardcoded Supabase URL

#### **send-expiration-reminder-email**  
- ✅ Uses `NEXT_PUBLIC_APP_URL` for dashboard and renewal URLs
- ✅ Uses `SUPABASE_URL` instead of hardcoded Supabase URL
- ✅ Fixed Stripe API calls to use fetch instead of deprecated library

#### **Database Functions Fixed**
- ✅ Removed hardcoded URLs and API keys from `check_and_send_expiration_reminders()`
- ✅ Updated `send_premium_upsell_email_trigger()` to be more secure

### 3. Migration Files Created ✅
Your database schema is now properly version-controlled in `supabase/migrations/`:
- All tables, functions, triggers, and RLS policies are captured
- Future changes can be tracked and deployed consistently
- Easy rollback capability if needed

## What You Need To Do Next

### 1. Set Environment Variables for Edge Functions 🔧

Run these commands to set your production environment variables:

```bash
# App URLs (replace with your actual domain)
npx supabase secrets set NEXT_PUBLIC_SITE_URL=https://mailmop.com
npx supabase secrets set NEXT_PUBLIC_APP_URL=https://mailmop.com

# Email service (replace with your actual Resend API key)
npx supabase secrets set RESEND_API_KEY=your_actual_resend_api_key_here

# Stripe configuration (replace with your actual keys)
npx supabase secrets set STRIPE_SECRET_KEY=your_actual_stripe_secret_key_here
npx supabase secrets set STRIPE_PRICE_ID=your_actual_stripe_price_id_here

# Optional: Cron job security
npx supabase secrets set CRON_SECRET=your_secure_random_string_here
```

### 2. Verify Environment Variables 🔍
```bash
npx supabase secrets list
```

### 3. Test Your Edge Functions 🧪
After setting the environment variables, test your edge functions to ensure they work correctly:
- Premium upsell emails
- Expiration reminder emails  
- Welcome emails
- Upgrade thank you emails

## How to Keep Database & Migrations in Sync

### For Future Schema Changes:

#### Option 1: Create Migration First (Recommended)
```bash
# Create a new migration
npx supabase migration new your_change_description

# Edit the migration file in supabase/migrations/
# Then apply it
npx supabase db push
```

#### Option 2: Make Changes in Dashboard, Then Capture
```bash
# After making changes in Supabase Dashboard
npx supabase db diff --schema public > supabase/migrations/$(date +%Y%m%d%H%M%S)_your_changes.sql

# Review the diff, then apply
npx supabase db push
```

### For Deploying to New Environments:
```bash
# Deploy all migrations to a fresh database
npx supabase db push

# Or reset and replay all migrations
npx supabase db reset
```

## Benefits You Now Have

### 🔒 **Security**
- No more hardcoded API keys or URLs in your codebase
- Environment-specific configuration
- Secure secret management

### 📦 **Version Control**
- Complete database schema in version control
- Track all changes over time
- Easy rollbacks if needed
- Consistent deployments across environments

### 🚀 **Flexibility** 
- Easy to deploy to staging/production environments
- Environment-specific URLs and configurations
- No more manual database setup

### 🛠 **Maintainability**
- Clear migration history
- Documented database changes
- Easier collaboration with team members

## Files Created/Modified

### New Files:
- `supabase/migrations/20241201000000_initial_schema.sql`
- `supabase/migrations/20241201000001_rls_policies.sql` 
- `supabase/migrations/20241201000002_seed_data.sql`
- `supabase/migrations/20250604230058_fix_hardcoded_urls_in_functions.sql`
- `setup-edge-function-env.md` (detailed environment setup guide)

### Modified Files:
- `supabase/functions/send-premium-upsell-email/index.ts`
- `supabase/functions/send-expiration-reminder-email/index.ts`

## Next Steps Checklist

- [ ] Set all required environment variables using `npx supabase secrets set`
- [ ] Verify environment variables with `npx supabase secrets list`
- [ ] Test edge functions to ensure they work with new environment variables
- [ ] Update your deployment pipeline to use migrations (`npx supabase db push`)
- [ ] Document your environment variables for team members
- [ ] Consider setting up staging environment with different URLs

## Need Help?

If you encounter any issues:
1. Check the environment variables are set correctly
2. Review the edge function logs in Supabase Dashboard
3. Ensure your domain URLs are correct and accessible
4. Verify your API keys (Resend, Stripe) are valid

Your MailMop project is now properly set up with migrations and environment variables! 🎉 