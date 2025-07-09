import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/supabase/client';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Apply rate limiting first
    const rateLimit = checkRateLimit(req, RATE_LIMITS.USER_ACTION);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    // SECURITY: Authenticate user via Bearer token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Bearer token required' }, { status: 401 });
    }

    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[API/Update-Subscription] Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    console.log(`[API/Update-Subscription] Authenticated user ${user.id} attempting subscription update`);

    const { subscriptionId, enableAutoRenew, cancelAtPeriodEnd } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
    }

    // SECURITY: Verify the user owns this subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.stripe_subscription_id || profile.stripe_subscription_id !== subscriptionId) {
      console.warn(`[API/Update-Subscription] User ${user.id} attempted to modify subscription ${subscriptionId} they don't own`);
      return NextResponse.json({ error: 'Forbidden - Subscription not owned by user' }, { status: 403 });
    }

    // Get the current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    let updatedSubscription;

    // Handle simple auto-renewal toggle (from ManageSubscriptionModal)
    if (cancelAtPeriodEnd !== undefined) {
      console.log('[API] Toggling auto-renewal:', { cancelAtPeriodEnd });
      
      if (!cancelAtPeriodEnd) {
        // Enabling auto-renewal: First clear any scheduled cancellation, then disable cancel_at_period_end
        if (subscription.cancel_at) {
          console.log('[API] Clearing scheduled cancellation first');
          await stripe.subscriptions.update(subscriptionId, {
            cancel_at: null,
          });
        }
        
        // Then enable auto-renewal
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        });
      } else {
        // Disabling auto-renewal: Just set cancel_at_period_end to true
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    }
    // Handle renewal flow (from RenewalModal)
    else if (enableAutoRenew !== undefined) {
      console.log('[API] Processing renewal:', { enableAutoRenew });
      
      if (enableAutoRenew) {
        // Option 1: "Renew and Enable Auto-Renew" - Clear cancellation first, then enable auto-renewal
        if (subscription.cancel_at) {
          console.log('[API] Clearing scheduled cancellation for auto-renewal');
          await stripe.subscriptions.update(subscriptionId, {
            cancel_at: null,
          });
        }
        
        // Then enable auto-renewal
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
          proration_behavior: 'none',
        });
      } else {
        // Option 2: "Renew for One Year" - Schedule cancellation for new date and ensure cancel_at_period_end is true
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        const now = new Date();
        
        // Calculate new cancellation date: 
        // If current date < previous end date, use previous end date + 365 days
        // Otherwise, use current date + 365 days
        let newCancelDate;
        if (now < currentPeriodEnd) {
          newCancelDate = new Date(currentPeriodEnd);
          newCancelDate.setDate(newCancelDate.getDate() + 365);
        } else {
          newCancelDate = new Date(now);
          newCancelDate.setDate(newCancelDate.getDate() + 365);
        }

        console.log('[API] Scheduling cancellation for:', newCancelDate.toISOString());
        
        // First, ensure cancel_at_period_end is true (for one-time renewal)
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

        // Then schedule cancellation for the new date
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at: Math.floor(newCancelDate.getTime() / 1000),
        });
      }
    } else {
      return NextResponse.json({ error: 'Missing required parameter: enableAutoRenew or cancelAtPeriodEnd' }, { status: 400 });
    }

    // The webhook will handle updating the database
    return NextResponse.json({ 
      success: true, 
      subscription: {
        id: updatedSubscription.id,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        cancel_at: updatedSubscription.cancel_at,
        current_period_end: updatedSubscription.current_period_end,
      }
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 