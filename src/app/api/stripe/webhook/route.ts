// /app/api/stripe-webhook/route.ts

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

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
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        // Try multiple sources for user ID (fallback for legacy email campaigns)
        const userId = session.client_reference_id || session.metadata?.supabase_user_id || session.metadata?.user_id;
        const sessionType = session.metadata?.type;

        if (!userId) {
          console.error('[Webhook] Missing user identifier (checked client_reference_id, metadata.supabase_user_id, metadata.user_id)', {
            session_id: session.id,
            metadata: session.metadata
          });
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
        }

        console.log('[Webhook] Processing checkout for user:', userId, 'session type:', sessionType || 'unknown');

        if (sessionType === 'subscription_extension') {
          console.log('[Webhook] Processing subscription extension for user:', userId);
          
          // Get current profile to extend the expiration date
          const { data: currentProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('plan_expires_at')
            .eq('user_id', userId)
            .single();

          if (profileError || !currentProfile) {
            console.error('[Webhook] Failed to get current profile:', profileError);
            return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
          }

          // Calculate new expiration date (current expiration + 365 days)
          const currentExpiration = new Date(currentProfile.plan_expires_at);
          const newExpiration = new Date(currentExpiration);
          newExpiration.setDate(newExpiration.getDate() + 365);

          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              plan: 'pro',
              plan_expires_at: newExpiration.toISOString(),
              cancel_at_period_end: true, // Default to cancel at period end (no auto-renewal)
              plan_updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('[Webhook] Failed to extend subscription:', updateError);
            return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
          }

          console.log('[Webhook] Subscription extended for user:', userId, 'New expiration:', newExpiration.toISOString());
        } else if (sessionType === 'new_subscription') {
          // Handle new subscription creation
          const subscriptionId = session.subscription as string;

          if (!subscriptionId) {
            console.error('[Webhook] Missing subscription ID for new subscription');
            return NextResponse.json({ error: 'Missing subscription_id' }, { status: 400 });
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          // Validate subscription status
          if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            console.error('[Webhook] Invalid subscription status:', subscription.status);
            return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
          }

          // Ensure we have a valid expiration date
          const planExpiresAt = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          if (!planExpiresAt) {
            console.error('[Webhook] Missing current_period_end');
            return NextResponse.json({ error: 'Missing expiration date' }, { status: 400 });
          }

          await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true // Default to cancel at period end (no auto-renewal)
          });

          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan: 'pro',
              plan_expires_at: planExpiresAt,
              cancel_at_period_end: true, // Default to cancel at period end (no auto-renewal)
              plan_updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('[Webhook] Failed to update profile:', updateError);
            return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
          }

          console.log('[Webhook] New subscription created for user:', userId);
        } else {
          // Handle legacy checkouts or missing metadata.type
          // If mode is 'subscription', treat it as a new subscription
          if (session.mode === 'subscription' && session.subscription) {
            console.log('[Webhook] Legacy/unknown session type, but mode is subscription - attempting to process as new subscription');
            
            const subscriptionId = session.subscription as string;
            
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);

              // Validate subscription status
              if (subscription.status !== 'active' && subscription.status !== 'trialing') {
                console.error('[Webhook] Invalid subscription status:', subscription.status);
                return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
              }

              // Ensure we have a valid expiration date
              const planExpiresAt = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null;

              if (!planExpiresAt) {
                console.error('[Webhook] Missing current_period_end');
                return NextResponse.json({ error: 'Missing expiration date' }, { status: 400 });
              }

              await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true // Default to cancel at period end (no auto-renewal)
              });

              const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  plan: 'pro',
                  plan_expires_at: planExpiresAt,
                  cancel_at_period_end: true,
                  plan_updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

              if (updateError) {
                console.error('[Webhook] Failed to update profile (legacy flow):', updateError);
                return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
              }

              console.log('[Webhook] Legacy subscription processed successfully for user:', userId);
            } catch (error) {
              console.error('[Webhook] Error processing legacy subscription:', error);
              return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
            }
          } else {
            console.log('[Webhook] Unknown session type and not a subscription, skipping', {
              mode: session.mode,
              has_subscription: !!session.subscription,
              metadata: session.metadata
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;

        if (!userId) {
          console.error('[Webhook] Missing supabase_user_id in metadata');
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        // Only process active or trialing subscriptions
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          console.log('[Webhook] Ignoring subscription update for status:', subscription.status);
          return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        // If current_period_end is missing, retrieve the subscription from Stripe to get complete data
        let fullSubscription = subscription;
        if (!subscription.current_period_end && subscription.id) {
          console.log('[Webhook] Missing current_period_end, retrieving subscription from Stripe');
          try {
            fullSubscription = await stripe.subscriptions.retrieve(subscription.id);
          } catch (error) {
            console.error('[Webhook] Failed to retrieve subscription:', error);
            // Continue with original subscription object
          }
        }

        // Determine plan expiration based on cancel_at and cancel_at_period_end
        // Priority: If cancel_at is set, always treat as cancel_at_period_end=true in Supabase
        let planExpiresAt = null;
        let supabaseCancelAtPeriodEnd = true; // Default to true
        
        if (fullSubscription.cancel_at) {
          // If there's a specific cancellation date set, use that and set cancel_at_period_end=true
          planExpiresAt = new Date(fullSubscription.cancel_at * 1000).toISOString();
          supabaseCancelAtPeriodEnd = true;
        } else if (fullSubscription.cancel_at_period_end) {
          // No specific cancel_at date, but cancel_at_period_end is true - use current_period_end
          if (fullSubscription.current_period_end) {
            planExpiresAt = new Date(fullSubscription.current_period_end * 1000).toISOString();
          }
          supabaseCancelAtPeriodEnd = true;
        } else {
          // Auto-renewing subscription - store the next billing date (current_period_end)
          if (fullSubscription.current_period_end) {
            planExpiresAt = new Date(fullSubscription.current_period_end * 1000).toISOString();
          }
          supabaseCancelAtPeriodEnd = false;
        }

        console.log('[Webhook] Processing subscription update:', {
          userId,
          subscriptionId: fullSubscription.id,
          stripe_cancel_at_period_end: fullSubscription.cancel_at_period_end,
          supabase_cancel_at_period_end: supabaseCancelAtPeriodEnd,
          cancel_at: fullSubscription.cancel_at,
          current_period_end: fullSubscription.current_period_end,
          current_period_end_date: fullSubscription.current_period_end ? new Date(fullSubscription.current_period_end * 1000).toISOString() : null,
          calculated_plan_expires_at: planExpiresAt,
          retrieved_fresh: fullSubscription !== subscription
        });

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            stripe_customer_id: fullSubscription.customer as string,
            stripe_subscription_id: fullSubscription.id,
            cancel_at_period_end: supabaseCancelAtPeriodEnd,
            plan_expires_at: planExpiresAt,
            plan_updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[Webhook] Failed to update subscription:', updateError);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log('[Webhook] Subscription updated for user:', userId, 'Customer ID:', fullSubscription.customer, 'Plan expires at:', planExpiresAt);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;

        if (!userId) {
          console.error('[Webhook] Missing supabase_user_id in metadata');
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        // Reset the user's profile to free plan
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            plan: 'free',
            plan_expires_at: null,
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            plan_updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[Webhook] Failed to reset profile:', updateError);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log('[Webhook] Profile reset to free plan for user:', userId);
        break;
      }

      // Add more events if needed...
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err) {
    console.error('[Webhook] Uncaught error:', err);
    return NextResponse.json({ error: 'Unhandled webhook error' }, { status: 500 });
  }
}
 