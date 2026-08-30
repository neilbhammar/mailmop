/**
 * Discount A/B/C experiment.
 *
 * Background: since the automatic discount toast shipped, the large majority of
 * conversions have used the code, while the conversion rate itself did not move
 * measurably. This experiment tests whether the discount is buying conversions or
 * just discounting people who would have paid anyway.
 *
 * Variants:
 *   control  - EARLYBIRD50, 50% off. The status quo.
 *   none     - no discount offered at all.
 *   early25  - EARLY25, 25% off. Tests whether a smaller discount holds conversion.
 *
 * Assignment is a pure function of user_id, so:
 *   - a user always lands in the same bucket, on any device, with no storage
 *   - assignment survives a cleared localStorage (the old toast did not)
 *   - the bucket can be recomputed for analysis even if the DB write failed
 *
 * The variant is also persisted to profiles.discount_variant on first exposure so
 * results are queryable in SQL. That column is a cache, not the source of truth.
 *
 * Full writeup: docs/experiments/2026-08-discount-ab-test.md
 */

export type DiscountVariant = 'control' | 'none' | 'early25'

export interface DiscountOffer {
  /** Promotion code the user types at Stripe checkout. */
  code: string
  /** Human phrasing used in the toast and in email copy. */
  label: string
  /** Percent off, for analytics and copy. */
  percentOff: number
}

/**
 * Bucket boundaries out of 100. Kept explicit rather than computed so a reader can
 * see the split at a glance and so shifting traffic is a one-line change.
 *
 * control 0-33 (34%), none 34-66 (33%), early25 67-99 (33%)
 *
 * Do NOT change these mid-experiment. Re-splitting moves users between buckets and
 * invalidates everything collected so far.
 */
export const VARIANT_BUCKETS: ReadonlyArray<{ variant: DiscountVariant; maxExclusive: number }> = [
  { variant: 'control', maxExclusive: 34 },
  { variant: 'none', maxExclusive: 67 },
  { variant: 'early25', maxExclusive: 100 },
]

/**
 * Salt keeps this experiment's bucketing independent from any future experiment
 * that hashes the same user_id. Changing it reshuffles every user, so treat it as
 * part of the experiment's identity.
 */
const EXPERIMENT_SALT = 'discount-abc-2026-08'

/**
 * FNV-1a, 32-bit. Chosen over crypto.subtle because it is synchronous (the toast
 * decision happens during a render path) and deterministic across environments.
 * This is not security sensitive, it only needs even distribution.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    // hash * 16777619, kept in 32-bit unsigned range
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Deterministically assigns a user to a variant. Same input always gives same output. */
export function assignVariant(userId: string): DiscountVariant {
  const bucket = fnv1a(`${EXPERIMENT_SALT}:${userId}`) % 100

  for (const { variant, maxExclusive } of VARIANT_BUCKETS) {
    if (bucket < maxExclusive) return variant
  }

  // Unreachable while the last bucket ends at 100, but a wrong split should fail
  // toward the status quo rather than silently dropping the user out of the test.
  return 'control'
}

/** The offer to show for a variant, or null when the variant shows no discount. */
export function getOfferForVariant(variant: DiscountVariant): DiscountOffer | null {
  switch (variant) {
    case 'control':
      return { code: 'EARLYBIRD50', label: '50% discount', percentOff: 50 }
    case 'early25':
      return { code: 'EARLY25', label: '25% discount', percentOff: 25 }
    case 'none':
      return null
  }
}

/** Exposed for the experiment readout so analysis and runtime cannot drift apart. */
export function bucketFor(userId: string): number {
  return fnv1a(`${EXPERIMENT_SALT}:${userId}`) % 100
}
