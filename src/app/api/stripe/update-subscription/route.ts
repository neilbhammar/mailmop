import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

// Use server-side admin client for API operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Get user from Supabase auth using admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[API/Update-Subscription] Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    console.log(`[API/Update-Subscription] Authenticated user ${user.id} attempting subscription update`);
    console.log(`[API/Update-Subscription] User object:`, {
      id: user.id,
      email: user.email,
      aud: user.aud,
      role: user.role
    });

    const { subscriptionId, enableAutoRenew, cancelAtPeriodEnd } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
    }

    // SECURITY: Verify the user owns this subscription
    console.log(`[API/Update-Subscription] Looking up profile for user_id: ${user.id}`);
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id, plan, plan_expires_at, user_id, email')
      .eq('user_id', user.id)
      .single();

    console.log(`[API/Update-Subscription] Profile query result:`, {
      profile,
      profileError,
      hasData: !!profile,
      errorCode: profileError?.code,
      errorMessage: profileError?.message
    });

    console.log(`[API/Update-Subscription] User ${user.id} profile:`, {
      stored_subscription_id: profile?.stripe_subscription_id,
      requested_subscription_id: subscriptionId,
      plan: profile?.plan,
      plan_expires_at: profile?.plan_expires_at,
      customer_id: profile?.stripe_customer_id
    });

    // Enhanced ownership verification
    if (!profile) {
      console.warn(`[API/Update-Subscription] User ${user.id} has no profile`);
      return NextResponse.json({ error: 'Forbidden - User profile not found' }, { status: 403 });
    }

    // Check if user has a Pro plan (basic authorization)
    if (profile.plan !== 'pro') {
      console.warn(`[API/Update-Subscription] User ${user.id} is not a Pro user (plan: ${profile.plan})`);
      return NextResponse.json({ error: 'Forbidden - Pro plan required' }, { status: 403 });
    }

    // If user has stored subscription ID, verify it matches
    if (profile.stripe_subscription_id && profile.stripe_subscription_id !== subscriptionId) {
      console.warn(`[API/Update-Subscription] User ${user.id} subscription ID mismatch - stored: ${profile.stripe_subscription_id}, requested: ${subscriptionId}`);
      return NextResponse.json({ error: 'Forbidden - Subscription ID mismatch' }, { status: 403 });
    }

    // If no stored subscription ID but user is Pro, verify the subscription belongs to their customer
    if (!profile.stripe_subscription_id && profile.stripe_customer_id) {
      console.log(`[API/Update-Subscription] No stored subscription ID for user ${user.id}, verifying against Stripe customer ${profile.stripe_customer_id}`);
      
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.customer !== profile.stripe_customer_id) {
          console.warn(`[API/Update-Subscription] User ${user.id} subscription customer mismatch - expected: ${profile.stripe_customer_id}, actual: ${subscription.customer}`);
          return NextResponse.json({ error: 'Forbidden - Subscription does not belong to user' }, { status: 403 });
        }
        
        // Update profile with the subscription ID for future use
        console.log(`[API/Update-Subscription] Updating user ${user.id} profile with subscription ID ${subscriptionId}`);
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_subscription_id: subscriptionId })
          .eq('user_id', user.id);
          
      } catch (stripeError) {
        console.error(`[API/Update-Subscription] Error verifying subscription ${subscriptionId}:`, stripeError);
        return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
      }
    }

    // If user has no customer ID and no subscription ID, they shouldn't be able to modify subscriptions
    if (!profile.stripe_customer_id && !profile.stripe_subscription_id) {
      console.warn(`[API/Update-Subscription] User ${user.id} has no Stripe customer or subscription IDs`);
      return NextResponse.json({ error: 'Forbidden - No Stripe account found' }, { status: 403 });
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