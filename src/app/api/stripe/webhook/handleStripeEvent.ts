import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveSubscriptionState, extendExpiry } from '@/lib/stripe/subscriptionState'

/**
 * Core Stripe webhook business logic, extracted from the route handler so it can
 * be unit-tested with injected (mocked) Stripe + Supabase clients. The route is
 * responsible for rate-limiting and signature verification; this function only
 * processes an already-verified event.
 */
export interface StripeEventDeps {
  stripe: Stripe
  supabaseAdmin: SupabaseClient
}

export interface HandlerResult {
  status: number
  body: Record<string, unknown>
}

const ok: HandlerResult = { status: 200, body: { status: 'ok' } }

/**
 * Persist a subscription-mode checkout (new or legacy) to the user's profile.
 *
 * IMPORTANT: New subscriptions now default to auto-renew ON. We deliberately do
 * NOT call `stripe.subscriptions.update({ cancel_at_period_end: true })` here —
 * Stripe creates subscriptions with `cancel_at_period_end: false`, so deriving
 * straight from the subscription yields auto-renew ON.
 */
async function persistNewSubscription(
  session: Stripe.Checkout.Session,
  userId: string,
  deps: StripeEventDeps
): Promise<HandlerResult> {
  const subscriptionId = session.subscription as string | null
  if (!subscriptionId) {
    console.error('[Webhook] Missing subscription ID for new subscription')
    return { status: 400, body: { error: 'Missing subscription_id' } }
  }

  const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId)

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    console.error('[Webhook] Invalid subscription status:', subscription.status)
    return { status: 400, body: { error: 'Invalid subscription status' } }
  }

  const { planExpiresAt, cancelAtPeriodEnd } = deriveSubscriptionState(subscription)

  if (!planExpiresAt) {
    console.error('[Webhook] Missing current_period_end')
    return { status: 400, body: { error: 'Missing expiration date' } }
  }

  const { error } = await deps.supabaseAdmin
    .from('profiles')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      plan: 'pro',
      plan_expires_at: planExpiresAt,
      cancel_at_period_end: cancelAtPeriodEnd, // false === auto-renew ON (new default)
      plan_updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[Webhook] Failed to update profile:', error)
    return { status: 500, body: { error: 'DB update failed' } }
  }

  console.log('[Webhook] New subscription created for user:', userId, 'auto-renew:', !cancelAtPeriodEnd)
  return ok
}

export async function handleStripeEvent(
  event: Stripe.Event,
  deps: StripeEventDeps
): Promise<HandlerResult> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      // Try multiple sources for user ID (fallback for legacy email campaigns)
      const userId =
        session.client_reference_id ||
        session.metadata?.supabase_user_id ||
        session.metadata?.user_id

      const sessionType = session.metadata?.type

      if (!userId) {
        console.error('[Webhook] Missing user identifier', { session_id: session.id })
        return { status: 400, body: { error: 'Missing user_id' } }
      }

      if (sessionType === 'subscription_extension') {
        // One-time payment that extends an existing subscription by 365 days.
        const { data: currentProfile, error: profileError } = await deps.supabaseAdmin
          .from('profiles')
          .select('plan_expires_at')
          .eq('user_id', userId)
          .single()

        if (profileError || !currentProfile) {
          console.error('[Webhook] Failed to get current profile:', profileError)
          return { status: 500, body: { error: 'Failed to get profile' } }
        }

        let newExpiration: string
        try {
          newExpiration = extendExpiry(currentProfile.plan_expires_at)
        } catch (err) {
          console.error('[Webhook] Cannot extend subscription:', err)
          return { status: 400, body: { error: 'Invalid current expiration' } }
        }

        // NOTE: we intentionally do NOT set cancel_at_period_end here — an
        // extension is orthogonal to the auto-renew preference, so we preserve
        // whatever the user already had.
        const { error: updateError } = await deps.supabaseAdmin
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            plan: 'pro',
            plan_expires_at: newExpiration,
            plan_updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('[Webhook] Failed to extend subscription:', updateError)
          return { status: 500, body: { error: 'DB update failed' } }
        }

        console.log('[Webhook] Subscription extended for user:', userId, 'New expiration:', newExpiration)
        return ok
      }

      if (sessionType === 'new_subscription') {
        return persistNewSubscription(session, userId, deps)
      }

      // Legacy / unknown type: if it's a subscription-mode checkout, treat it as
      // a new subscription (also auto-renew ON by default).
      if (session.mode === 'subscription' && session.subscription) {
        console.log('[Webhook] Legacy/unknown session type, processing as new subscription')
        try {
          return await persistNewSubscription(session, userId, deps)
        } catch (err) {
          console.error('[Webhook] Error processing legacy subscription:', err)
          return { status: 500, body: { error: 'Failed to process subscription' } }
        }
      }

      console.log('[Webhook] Unknown session type and not a subscription, skipping')
      return ok
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id

      if (!userId) {
        console.error('[Webhook] Missing supabase_user_id in metadata')
        return { status: 400, body: { error: 'Missing metadata' } }
      }

      // Only process active or trialing subscriptions.
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        console.log('[Webhook] Ignoring subscription update for status:', subscription.status)
        return { status: 200, body: { status: 'ignored' } }
      }

      // If current_period_end is missing, retrieve the full subscription.
      let fullSubscription = subscription
      if (!subscription.current_period_end && subscription.id) {
        try {
          fullSubscription = await deps.stripe.subscriptions.retrieve(subscription.id)
        } catch (err) {
          console.error('[Webhook] Failed to retrieve subscription:', err)
        }
      }

      const { planExpiresAt, cancelAtPeriodEnd } = deriveSubscriptionState(fullSubscription)

      const { error: updateError } = await deps.supabaseAdmin
        .from('profiles')
        .update({
          stripe_customer_id: fullSubscription.customer as string,
          stripe_subscription_id: fullSubscription.id,
          cancel_at_period_end: cancelAtPeriodEnd,
          plan_expires_at: planExpiresAt,
          plan_updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('[Webhook] Failed to update subscription:', updateError)
        return { status: 500, body: { error: 'DB update failed' } }
      }

      console.log('[Webhook] Subscription updated for user:', userId, 'auto-renew:', !cancelAtPeriodEnd, 'expires:', planExpiresAt)
      return ok
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id

      if (!userId) {
        console.error('[Webhook] Missing supabase_user_id in metadata')
        return { status: 400, body: { error: 'Missing metadata' } }
      }

      const { error: updateError } = await deps.supabaseAdmin
        .from('profiles')
        .update({
          plan: 'free',
          plan_expires_at: null,
          stripe_subscription_id: null,
          cancel_at_period_end: false,
          plan_updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('[Webhook] Failed to reset profile:', updateError)
        return { status: 500, body: { error: 'DB update failed' } }
      }

      console.log('[Webhook] Profile reset to free plan for user:', userId)
      return ok
    }

    default:
      return ok
  }
}
