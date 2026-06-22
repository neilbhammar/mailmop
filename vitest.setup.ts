// Dummy env vars so any module-level Stripe/Supabase client construction
// succeeds at import time. Tests inject their own mocked clients.
process.env.STRIPE_SECRET_KEY ||= 'sk_test_dummy'
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_dummy'
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'service_role_dummy'
process.env.NEXT_PUBLIC_SITE_URL ||= 'http://localhost:3000'
