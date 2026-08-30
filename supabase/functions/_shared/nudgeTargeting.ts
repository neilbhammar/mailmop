/**
 * Pure targeting logic for the lifecycle nudge emails.
 *
 * This lives apart from the edge functions on purpose. Deciding WHO receives an
 * email is the part that is expensive to get wrong (mailing the wrong cohort, or
 * mailing the same person twice), so it is kept free of Deno globals, network
 * calls and clocks, and is covered by nudgeTargeting.test.ts.
 *
 * The edge functions are then thin: fetch rows, call these functions, send.
 */

export interface Candidate {
  user_id: string
  email: string | null
  name?: string | null
  discount_variant?: string | null
}

export interface ActionRow {
  user_id: string
  type: string
}

export interface Window {
  /** Oldest signup/attempt included, ISO string. */
  windowStart: string
  /** Newest signup/attempt included (exclusive), ISO string. */
  windowEnd: string
}

/**
 * A rolling window that ends `minHours` ago and begins `maxHours` ago.
 *
 * The lower bound is what stops these jobs from mailing the entire historical
 * backlog the first time they run. Anything older than maxHours is permanently
 * out of scope, by design.
 */
export function computeWindow(nowMs: number, minHours: number, maxHours: number): Window {
  if (!(maxHours > minHours)) {
    throw new Error(`Invalid window: maxHours (${maxHours}) must exceed minHours (${minHours})`)
  }
  if (minHours < 0) {
    throw new Error(`Invalid window: minHours (${minHours}) must not be negative`)
  }

  return {
    windowStart: new Date(nowMs - maxHours * 60 * 60 * 1000).toISOString(),
    windowEnd: new Date(nowMs - minHours * 60 * 60 * 1000).toISOString(),
  }
}

/** First name for email copy, falling back to a neutral greeting. */
export function firstNameOf(name: string | null | undefined): string {
  const first = (name || '').trim().split(/\s+/)[0]
  return first || 'there'
}

/**
 * Activation nudge targets: signed up in the window, never ran an analysis, not
 * already nudged, and has an email address.
 *
 * `actions` should contain rows of type 'analysis' and 'activation_nudge_sent'
 * for the candidate set. Either type disqualifies.
 */
export function selectActivationTargets(candidates: Candidate[], actions: ActionRow[]): Candidate[] {
  const disqualified = new Set<string>()
  for (const a of actions) {
    if (a.type === 'analysis' || a.type === 'activation_nudge_sent') {
      disqualified.add(a.user_id)
    }
  }

  return candidates.filter((c) => !disqualified.has(c.user_id) && isMailable(c.email))
}

/**
 * Paywall nudge targets: hit a paywall in the window, still on free, not already
 * nudged, and has an email address.
 *
 * `freeProfiles` must already be filtered to plan='free' by the caller's query.
 */
export function selectPaywallTargets(
  freeProfiles: Candidate[],
  alreadySent: ActionRow[]
): Candidate[] {
  const sent = new Set(alreadySent.map((a) => a.user_id))
  return freeProfiles.filter((c) => !sent.has(c.user_id) && isMailable(c.email))
}

function isMailable(email: string | null | undefined): boolean {
  if (!email) return false
  const trimmed = email.trim()
  // Deliberately loose. Address validity is Resend's problem; this only guards
  // against empty strings and obviously malformed rows reaching the send loop.
  return trimmed.length > 3 && trimmed.includes('@')
}

/** Deduplicates user ids, preserving first-seen order. */
export function uniqueUserIds(rows: ActionRow[]): string[] {
  return [...new Set(rows.map((r) => r.user_id))]
}

/**
 * Rounds aggregate stats down so email copy does not imply false precision.
 * A rounded total reads as a real measured number. An exact one to the digit reads
 * like a number someone is trying too hard to sell you.
 */
export function roundStats(totalDeleted: number, avgPerProUser: number) {
  return {
    totalDeleted: Math.floor(totalDeleted / 10_000) * 10_000,
    avgPerProUser: Math.floor(avgPerProUser / 1_000) * 1_000,
  }
}

export interface Offer {
  code: string
  label: string
}

/**
 * Offer for a discount experiment variant. Mirrors getOfferForVariant in
 * src/lib/discountExperiment.ts. Both are covered by tests that assert the same
 * code strings, so a change to one without the other fails the suite.
 *
 * Anything unrecognised (including null, for users who never hit a paywall in the
 * app and so were never assigned) gets no discount. Failing closed matters here:
 * accidentally mailing a discount to the 'none' arm would corrupt the experiment.
 */
export function offerForVariant(variant: string | null | undefined): Offer | null {
  switch (variant) {
    case 'control':
      return { code: 'EARLYBIRD50', label: '50% off your first year' }
    case 'early25':
      return { code: 'EARLY25', label: '25% off your first year' }
    default:
      return null
  }
}

/** True when a run selected more recipients than the safety cap allows. */
export function exceedsCap(targetCount: number, cap: number): boolean {
  return targetCount > cap
}
