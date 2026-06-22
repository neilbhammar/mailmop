import { describe, it, expect, vi } from 'vitest'
import { handleStripeEvent } from './handleStripeEvent'

const PERIOD_END = 1893456000 // unix seconds
const CANCEL_AT = 1800000000
const iso = (s: number) => new Date(s * 1000).toISOString()

/**
 * Minimal chainable Supabase mock that captures every `.update()` payload.
 * Supports both the select chain (`from().select().eq().single()`) and the
 * update chain (`from().update().eq()`).
 */
function makeSupabase(profile: unknown = null) {
  const updates: Record<string, unknown>[] = []
  const client: any = {
    from: () => client,
    select: () => client,
    eq: () => client,
    single: () => Promise.resolve({ data: profile, error: null }),
    update: (payload: Record<string, unknown>) => {
      updates.push(payload)
      return { eq: () => Promise.resolve({ error: null }) }
    },
  }
  return { client, updates }
}

function makeStripe(retrieveResult: unknown) {
  return {
    subscriptions: {
      retrieve: vi.fn(async () => retrieveResult),
      update: vi.fn(async (id: string, params: Record<string, unknown>) => ({ id, ...params })),
    },
  } as any
}

const lastUpdate = (updates: Record<string, unknown>[]) => updates[updates.length - 1]

describe('handleStripeEvent — new subscription default', () => {
  it('defaults a brand-new subscription to auto-renew ON and never force-cancels it', async () => {
    const sub = {
      id: 'sub_1',
      status: 'active',
      cancel_at: null,
      cancel_at_period_end: false,
      current_period_end: PERIOD_END,
      customer: 'cus_1',
    }
    const stripe = makeStripe(sub)
    const { client, updates } = makeSupabase()

    const result = await handleStripeEvent(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1',
            customer: 'cus_1',
            client_reference_id: 'user_1',
            mode: 'subscription',
            subscription: 'sub_1',
            metadata: { type: 'new_subscription', supabase_user_id: 'user_1' },
          },
        },
      } as any,
      { stripe, supabaseAdmin: client }
    )

    expect(result.status).toBe(200)
    // The whole point of option (a): new subs auto-renew.
    expect(lastUpdate(updates)).toMatchObject({
      plan: 'pro',
      cancel_at_period_end: false,
      plan_expires_at: iso(PERIOD_END),
      stripe_subscription_id: 'sub_1',
      stripe_customer_id: 'cus_1',
    })
    // We must NOT push the Stripe subscription into cancel_at_period_end=true anymore.
    expect(stripe.subscriptions.update).not.toHaveBeenCalled()
  })

  it('also defaults legacy subscription checkouts (no metadata.type) to auto-renew ON', async () => {
    const sub = {
      id: 'sub_legacy',
      status: 'active',
      cancel_at: null,
      cancel_at_period_end: false,
      current_period_end: PERIOD_END,
      customer: 'cus_2',
    }
    const stripe = makeStripe(sub)
    const { client, updates } = makeSupabase()

    const result = await handleStripeEvent(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_2',
            customer: 'cus_2',
            client_reference_id: 'user_2',
            mode: 'subscription',
            subscription: 'sub_legacy',
            metadata: {},
          },
        },
      } as any,
      { stripe, supabaseAdmin: client }
    )

    expect(result.status).toBe(200)
    expect(lastUpdate(updates)).toMatchObject({
      plan: 'pro',
      cancel_at_period_end: false,
      plan_expires_at: iso(PERIOD_END),
    })
    expect(stripe.subscriptions.update).not.toHaveBeenCalled()
  })
})

describe('handleStripeEvent — auto-renew toggle round-trip (customer.subscription.updated)', () => {
  it('turns auto-renew OFF: cancel_at_period_end=true keeps Pro until period end', async () => {
    const stripe = makeStripe(null)
    const { client, updates } = makeSupabase()

    const result = await handleStripeEvent(
      {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            customer: 'cus_1',
            cancel_at: null,
            cancel_at_period_end: true,
            current_period_end: PERIOD_END,
            metadata: { supabase_user_id: 'user_1' },
          },
        },
      } as any,
      { stripe, supabaseAdmin: client }
    )

    expect(result.status).toBe(200)
    expect(lastUpdate(updates)).toMatchObject({
      cancel_at_period_end: true,
      plan_expires_at: iso(PERIOD_END),
      stripe_subscription_id: 'sub_1',
    })
  })

  it('turns auto-renew OFF with a scheduled cancel_at date', async () => {
    const stripe = makeStripe(null)
    const { client, updates } = makeSupabase()

    await handleStripeEvent(
      {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            customer: 'cus_1',
            cancel_at: CANCEL_AT,
            cancel_at_period_end: true,
            current_period_end: PERIOD_END,
            metadata: { supabase_user_id: 'user_1' },
          },
        },
      } as any,
      { stripe, supabaseAdmin: client }
    )

    expect(lastUpdate(updates)).toMatchObject({
      cancel_at_period_end: true,
      plan_expires_at: iso(CANCEL_AT),
    })
  })

  it('turns auto-renew back ON: cancel_at_period_end=false', async () => {
    const stripe = makeStripe(null)
    const { client, updates } = makeSupabase()

    await handleStripeEvent(
      {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            customer: 'cus_1',
            cancel_at: null,
            cancel_at_period_end: false,
            current_period_end: PERIOD_END,
            metadata: { supabase_user_id: 'user_1' },
          },
        },
      } as any,
      { stripe, supabaseAdmin: client }
    )

    expect(lastUpdate(updates)).toMatchObject({
      cancel_at_period_end: false,
      plan_expires_at: iso(PERIOD_END),
    })
  })

  it('ignores updates for non-active subscriptions without writing', async () => {
    const stripe = makeStripe(null)
    const { client, updates } = makeSupabase()

    const result = await handleStripeEvent(
      {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'past_due',
            customer: 'cus_1',
            cancel_at: null,
            cancel_at_period_end: false,
            current_period_end: PERIOD_END,
            metadata: { supabase_user_id: 'user_1' },
          },
        },
      } as any,
      { stripe, supabaseAdmin: client }
    )

    expect(result.status).toBe(200)
    expect(updates).toHaveLength(0)
  })
})

describe('handleStripeEvent — extension preserves auto-renew setting', () => {
  it('extends expiry by 365 days and does NOT touch cancel_at_period_end', async () => {
    const stripe = makeStripe(null)
    const { client, updates } = makeSupabase({ plan_expires_at: '2026-10-01T00:00:00.000Z' })

    const result = await handleStripeEvent(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_ext',
            customer: 'cus_1',
            client_reference_id: 'user_1',
            mode: 'payment',
            metadata: {
              type: 'subscription_extension',
              supabase_user_id: 'user_1',
              existing_subscription_id: 'sub_1',
            },
          },
        },
      } as any,
      { stripe, supabaseAdmin: client }
    )

    expect(result.status).toBe(200)
    const update = lastUpdate(updates)
    expect(update).toMatchObject({
      plan: 'pro',
      plan_expires_at: '2027-10-01T00:00:00.000Z',
    })
    // Must preserve whatever the user's auto-renew setting was — never hardcode it.
    expect('cancel_at_period_end' in update).toBe(false)
  })
})

describe('handleStripeEvent — cancellation', () => {
  it('resets the profile to free when the subscription is deleted', async () => {
    const stripe = makeStripe(null)
    const { client, updates } = makeSupabase()

    await handleStripeEvent(
      {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            metadata: { supabase_user_id: 'user_1' },
          },
        },
      } as any,
      { stripe, supabaseAdmin: client }
    )

    expect(lastUpdate(updates)).toMatchObject({
      plan: 'free',
      plan_expires_at: null,
      stripe_subscription_id: null,
      cancel_at_period_end: false,
    })
  })
})
