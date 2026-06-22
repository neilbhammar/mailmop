/**
 * Pure, dependency-free helpers for translating Stripe subscription data into
 * the shape we persist on the `profiles` table. Kept free of any Stripe/Supabase
 * client so it is trivially unit-testable.
 */

/** Number of days a one-time "extension" purchase adds to a subscription. */
export const EXTENSION_DAYS = 365

/** The subset of a Stripe subscription we need to derive plan state. */
export interface StripeSubscriptionLike {
  /** Unix seconds for a specific scheduled cancellation, or null. */
  cancel_at: number | null
  /** Whether Stripe will cancel the subscription at the end of the period. */
  cancel_at_period_end: boolean
  /** Unix seconds for the current period end / next renewal, or null. */
  current_period_end: number | null | undefined
}

export interface DerivedSubscriptionState {
  /** ISO string we store in `profiles.plan_expires_at`, or null if unknown. */
  planExpiresAt: string | null
  /** Value we store in `profiles.cancel_at_period_end` (false === auto-renew ON). */
  cancelAtPeriodEnd: boolean
}

/**
 * Derive the values we persist for a subscription.
 *
 * Rules (priority order):
 *  1. An explicit `cancel_at` date → not auto-renewing; expires on that date.
 *  2. `cancel_at_period_end === true` → not auto-renewing; expires at period end.
 *  3. Otherwise → auto-renewing; `plan_expires_at` tracks the next renewal date.
 *
 * Note: a brand-new Stripe subscription created via Checkout has
 * `cancel_at_period_end === false`, so this returns `cancelAtPeriodEnd: false`
 * (auto-renew ON) by default.
 */
export function deriveSubscriptionState(
  sub: StripeSubscriptionLike
): DerivedSubscriptionState {
  const toIso = (unixSeconds: number | null | undefined): string | null =>
    unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null

  if (sub.cancel_at) {
    return { planExpiresAt: toIso(sub.cancel_at), cancelAtPeriodEnd: true }
  }

  if (sub.cancel_at_period_end) {
    return { planExpiresAt: toIso(sub.current_period_end), cancelAtPeriodEnd: true }
  }

  return { planExpiresAt: toIso(sub.current_period_end), cancelAtPeriodEnd: false }
}

/**
 * Add `days` to an existing expiry and return an ISO string.
 * Throws on an invalid input so we never write a garbage expiry date.
 */
export function extendExpiry(
  current: string | number | Date,
  days: number = EXTENSION_DAYS
): string {
  const base = new Date(current as string | number | Date)
  if (current === null || current === undefined || Number.isNaN(base.getTime())) {
    throw new Error(`extendExpiry: invalid current expiry: ${String(current)}`)
  }
  const result = new Date(base)
  result.setDate(result.getDate() + days)
  return result.toISOString()
}
