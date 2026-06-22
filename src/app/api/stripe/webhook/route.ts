// /app/api/stripe/webhook/route.ts

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';
import { handleStripeEvent } from './handleStripeEvent';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Server-side Supabase client (admin privileges)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⛔️ never use in client code!
);

export async function POST(req: Request) {
  // SECURITY: Apply rate limiting to prevent webhook abuse
  const rateLimit = checkRateLimit(req, RATE_LIMITS.WEBHOOK);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetTime);
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('[Webhook] Missing Stripe signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[Webhook] Received event:', event.type);

  try {
    const result = await handleStripeEvent(event, { stripe, supabaseAdmin });
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error('[Webhook] Uncaught error:', err);
    return NextResponse.json({ error: 'Unhandled webhook error' }, { status: 500 });
  }
}
