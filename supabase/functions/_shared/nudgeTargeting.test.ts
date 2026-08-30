import { describe, it, expect } from 'vitest'
import {
  computeWindow,
  firstNameOf,
  selectActivationTargets,
  selectPaywallTargets,
  uniqueUserIds,
  roundStats,
  offerForVariant,
  exceedsCap,
  type Candidate,
  type ActionRow,
} from './nudgeTargeting'
import { getOfferForVariant, assignVariant } from '../../../src/lib/discountExperiment'

const user = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  user_id: id,
  email: `${id}@example.com`,
  name: 'Test User',
  ...over,
})

describe('computeWindow', () => {
  const now = Date.parse('2026-08-30T17:00:00.000Z')

  it('produces a 24h-72h rolling window', () => {
    const { windowStart, windowEnd } = computeWindow(now, 24, 72)
    expect(windowEnd).toBe('2026-08-29T17:00:00.000Z')
    expect(windowStart).toBe('2026-08-27T17:00:00.000Z')
  })

  it('excludes anything older than maxHours, which is what stops a backlog blast', () => {
    const { windowStart } = computeWindow(now, 24, 72)
    // A user who signed up in June must fall outside the window.
    expect(Date.parse('2026-06-15T00:00:00.000Z')).toBeLessThan(Date.parse(windowStart))
  })

  it('excludes anyone newer than minHours, so nobody is nudged before 24h', () => {
    const { windowEnd } = computeWindow(now, 24, 72)
    const signedUpTwoHoursAgo = now - 2 * 60 * 60 * 1000
    expect(signedUpTwoHoursAgo).toBeGreaterThan(Date.parse(windowEnd))
  })

  it('rejects an inverted window rather than silently mailing everyone', () => {
    expect(() => computeWindow(now, 72, 24)).toThrow(/must exceed/)
    expect(() => computeWindow(now, 24, 24)).toThrow(/must exceed/)
  })

  it('rejects a negative lower bound', () => {
    expect(() => computeWindow(now, -1, 72)).toThrow(/negative/)
  })
})

describe('firstNameOf', () => {
  it('takes the first token', () => {
    expect(firstNameOf('Trisha Arquilla')).toBe('Trisha')
  })
  it('falls back for empty, null and whitespace names', () => {
    expect(firstNameOf(null)).toBe('there')
    expect(firstNameOf('')).toBe('there')
    expect(firstNameOf('   ')).toBe('there')
    expect(firstNameOf(undefined)).toBe('there')
  })
  it('handles a single-word name', () => {
    expect(firstNameOf('Scott')).toBe('Scott')
  })
})

describe('selectActivationTargets', () => {
  const candidates = [user('a'), user('b'), user('c'), user('d')]

  it('excludes anyone who already ran an analysis', () => {
    const actions: ActionRow[] = [{ user_id: 'a', type: 'analysis' }]
    const targets = selectActivationTargets(candidates, actions)
    expect(targets.map((t) => t.user_id)).toEqual(['b', 'c', 'd'])
  })

  it('excludes anyone already nudged, so re-running the job is safe', () => {
    const actions: ActionRow[] = [{ user_id: 'b', type: 'activation_nudge_sent' }]
    const targets = selectActivationTargets(candidates, actions)
    expect(targets.map((t) => t.user_id)).toEqual(['a', 'c', 'd'])
  })

  it('is idempotent: feeding back the sends it just made yields nobody', () => {
    const first = selectActivationTargets(candidates, [])
    expect(first).toHaveLength(4)

    const sends: ActionRow[] = first.map((t) => ({ user_id: t.user_id, type: 'activation_nudge_sent' }))
    expect(selectActivationTargets(candidates, sends)).toHaveLength(0)
  })

  it('ignores unrelated action types', () => {
    const actions: ActionRow[] = [
      { user_id: 'a', type: 'view' },
      { user_id: 'b', type: 'premium_attempt' },
    ]
    expect(selectActivationTargets(candidates, actions)).toHaveLength(4)
  })

  it('skips rows with no usable email', () => {
    const withBadEmails = [user('a', { email: null }), user('b', { email: '' }), user('c', { email: 'x' }), user('d')]
    const targets = selectActivationTargets(withBadEmails, [])
    expect(targets.map((t) => t.user_id)).toEqual(['d'])
  })

  it('returns nothing for an empty candidate set', () => {
    expect(selectActivationTargets([], [])).toEqual([])
  })
})

describe('selectPaywallTargets', () => {
  const freeUsers = [user('a'), user('b'), user('c')]

  it('excludes anyone already nudged', () => {
    const targets = selectPaywallTargets(freeUsers, [{ user_id: 'b', type: 'paywall_nudge_sent' }])
    expect(targets.map((t) => t.user_id)).toEqual(['a', 'c'])
  })

  it('is idempotent across runs', () => {
    const first = selectPaywallTargets(freeUsers, [])
    const sends: ActionRow[] = first.map((t) => ({ user_id: t.user_id, type: 'paywall_nudge_sent' }))
    expect(selectPaywallTargets(freeUsers, sends)).toHaveLength(0)
  })

  it('trusts the caller to have filtered to free, but still requires an email', () => {
    const targets = selectPaywallTargets([user('a', { email: null }), user('b')], [])
    expect(targets.map((t) => t.user_id)).toEqual(['b'])
  })
})

describe('uniqueUserIds', () => {
  it('dedupes repeat paywall hits from the same user', () => {
    const rows: ActionRow[] = [
      { user_id: 'a', type: 'premium_attempt' },
      { user_id: 'a', type: 'premium_attempt' },
      { user_id: 'b', type: 'premium_attempt' },
      { user_id: 'a', type: 'premium_attempt' },
    ]
    expect(uniqueUserIds(rows)).toEqual(['a', 'b'])
  })

  it('handles an empty list', () => {
    expect(uniqueUserIds([])).toEqual([])
  })
})

describe('roundStats', () => {
  it('rounds down to avoid false precision', () => {
    expect(roundStats(2_356_927, 36_630)).toEqual({ totalDeleted: 2_350_000, avgPerProUser: 36_000 })
  })

  it('never rounds up, so the claim is always conservative', () => {
    const { totalDeleted, avgPerProUser } = roundStats(2_359_999, 36_999)
    expect(totalDeleted).toBeLessThanOrEqual(2_359_999)
    expect(avgPerProUser).toBeLessThanOrEqual(36_999)
  })

  it('handles small numbers without going negative', () => {
    expect(roundStats(500, 100)).toEqual({ totalDeleted: 0, avgPerProUser: 0 })
  })
})

describe('offerForVariant', () => {
  it('maps control to EARLYBIRD50 and early25 to EARLY25', () => {
    expect(offerForVariant('control')?.code).toBe('EARLYBIRD50')
    expect(offerForVariant('early25')?.code).toBe('EARLY25')
  })

  it('offers nothing to the none arm', () => {
    expect(offerForVariant('none')).toBeNull()
  })

  it('fails closed for unassigned or unknown variants', () => {
    // Critical: a bug here would leak a discount into the no-discount arm and
    // silently invalidate the experiment.
    expect(offerForVariant(null)).toBeNull()
    expect(offerForVariant(undefined)).toBeNull()
    expect(offerForVariant('')).toBeNull()
    expect(offerForVariant('garbage')).toBeNull()
    expect(offerForVariant('CONTROL')).toBeNull()
  })

  it('agrees with the client-side offer map, so email and toast never disagree', () => {
    for (const variant of ['control', 'none', 'early25'] as const) {
      const emailOffer = offerForVariant(variant)
      const clientOffer = getOfferForVariant(variant)
      expect(emailOffer?.code ?? null).toBe(clientOffer?.code ?? null)
    }
  })

  it('agrees for real assigned users end to end', () => {
    for (let i = 0; i < 500; i++) {
      const id = `user-${i}`
      const variant = assignVariant(id)
      expect(offerForVariant(variant)?.code ?? null).toBe(getOfferForVariant(variant)?.code ?? null)
    }
  })
})

describe('exceedsCap', () => {
  it('flags a run that would mail more than the cap', () => {
    expect(exceedsCap(51, 50)).toBe(true)
    expect(exceedsCap(50, 50)).toBe(false)
    expect(exceedsCap(0, 50)).toBe(false)
  })
})
