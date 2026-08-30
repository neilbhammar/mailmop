import { describe, it, expect, beforeEach } from 'vitest'
import {
  assignFreeDeleteVariant,
  evaluateFreeDelete,
  freeDeleteSuccessMessage,
  markLocallyConsumed,
  wasLocallyConsumed,
  __resetLocalConsumption,
  type FreeDeleteInput,
} from './freeDeleteExperiment'

/**
 * This gate stands in front of an irreversible delete. The tests below are
 * deliberately paranoid: the important property is not "allows the right things"
 * but "denies everything else". Any new input shape must default to denied.
 */

// A user id known to land in the free_delete arm, found by search so the tests
// do not depend on a hardcoded guess staying valid.
const TREATMENT_ID = (() => {
  for (let i = 0; i < 10_000; i++) {
    const id = `user-${i}`
    if (assignFreeDeleteVariant(id) === 'free_delete') return id
  }
  throw new Error('no treatment id found')
})()

const CONTROL_ID = (() => {
  for (let i = 0; i < 10_000; i++) {
    const id = `user-${i}`
    if (assignFreeDeleteVariant(id) === 'control') return id
  }
  throw new Error('no control id found')
})()

const input = (over: Partial<FreeDeleteInput> = {}): FreeDeleteInput => ({
  userId: TREATMENT_ID,
  plan: 'free',
  freeDeleteUsedAt: null,
  targetSenders: ['news@grailed.com'],
  emailCount: 58,
  ...over,
})

describe('assignFreeDeleteVariant', () => {
  const ids = Array.from({ length: 20_000 }, (_, i) => `u-${i}`)

  it('is deterministic', () => {
    for (const id of ids.slice(0, 200)) {
      expect(assignFreeDeleteVariant(id)).toBe(assignFreeDeleteVariant(id))
    }
  })

  it('splits close to 50/50', () => {
    const treat = ids.filter((id) => assignFreeDeleteVariant(id) === 'free_delete').length
    const pct = (treat / ids.length) * 100
    expect(pct).toBeGreaterThan(48)
    expect(pct).toBeLessThan(52)
  })

  it('is independent of the discount experiment salt', async () => {
    // Both hash user_id. If they correlated, the two experiments would confound.
    const { assignVariant } = await import('./discountExperiment')
    let agree = 0
    for (const id of ids) {
      const a = assignFreeDeleteVariant(id) === 'free_delete'
      const b = assignVariant(id) === 'control'
      if (a === b) agree++
    }
    const pct = (agree / ids.length) * 100
    // Independent assignment lands near the base rate, not near 0% or 100%.
    expect(pct).toBeGreaterThan(40)
    expect(pct).toBeLessThan(60)
  })
})

describe('evaluateFreeDelete - the allow path', () => {
  it('allows exactly one sender, unused quota, treatment arm', () => {
    const d = evaluateFreeDelete(input())
    expect(d.allowed).toBe(true)
    if (d.allowed) {
      expect(d.senderEmail).toBe('news@grailed.com')
      expect(d.emailCount).toBe(58)
      expect(d.variant).toBe('free_delete')
    }
  })

  it('allows a very large single sender, since there is no cap', () => {
    // The largest real delete operation on record is 69,294 emails. One sender's
    // worth is an accepted giveaway; "exactly one sender" is the binding limit.
    for (const n of [500, 5_000, 69_294, 250_000]) {
      expect(evaluateFreeDelete(input({ emailCount: n })).allowed).toBe(true)
    }
  })

  it('allows a single email', () => {
    expect(evaluateFreeDelete(input({ emailCount: 1 })).allowed).toBe(true)
  })

  it('trims whitespace off the sender address', () => {
    const d = evaluateFreeDelete(input({ targetSenders: ['  news@grailed.com  '] }))
    expect(d.allowed).toBe(true)
    if (d.allowed) expect(d.senderEmail).toBe('news@grailed.com')
  })
})

describe('evaluateFreeDelete - denials', () => {
  const denied = (over: Partial<FreeDeleteInput>, reason: string) => {
    const d = evaluateFreeDelete(input(over))
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe(reason)
  }

  it('denies with no user id', () => {
    denied({ userId: null }, 'missing_profile')
    denied({ userId: undefined }, 'missing_profile')
    denied({ userId: '' }, 'missing_profile')
  })

  it('denies Pro users so they never burn quota or pollute results', () => {
    denied({ plan: 'pro' }, 'already_pro')
  })

  it('denies the control arm', () => {
    denied({ userId: CONTROL_ID }, 'not_in_experiment')
  })

  it('denies once the quota is spent, for any non-empty marker', () => {
    denied({ freeDeleteUsedAt: '2026-08-30T00:00:00Z' }, 'quota_used')
    // A malformed or nonsense timestamp must still read as spent, never as unused.
    denied({ freeDeleteUsedAt: 'not-a-date' }, 'quota_used')
    denied({ freeDeleteUsedAt: '0' }, 'quota_used')
  })

  it('denies with no target', () => {
    denied({ targetSenders: [] }, 'no_target')
    denied({ targetSenders: null }, 'no_target')
    denied({ targetSenders: undefined }, 'no_target')
    denied({ targetSenders: ['   '] }, 'no_target')
  })

  it('denies more than one sender', () => {
    denied({ targetSenders: ['a@x.com', 'b@y.com'] }, 'multiple_senders')
    denied({ targetSenders: Array.from({ length: 40 }, (_, i) => `s${i}@x.com`) }, 'multiple_senders')
  })

  it('denies when the count is not a trustworthy positive integer', () => {
    for (const bad of [null, undefined, 0, -1, -500, NaN, Infinity, -Infinity, 12.5, '58' as unknown as number]) {
      denied({ emailCount: bad as number }, 'unknown_count')
    }
  })

})

describe('evaluateFreeDelete - precedence', () => {
  it('reports already_pro even when everything else is also wrong', () => {
    const d = evaluateFreeDelete(
      input({ plan: 'pro', freeDeleteUsedAt: '2026-01-01', targetSenders: [], emailCount: -1 })
    )
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe('already_pro')
  })

  it('reports quota_used before anything about the target', () => {
    const d = evaluateFreeDelete(input({ freeDeleteUsedAt: '2026-01-01', targetSenders: [], emailCount: 99_999 }))
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe('quota_used')
  })

  it('a control-arm Pro user is reported as pro, not as out-of-experiment', () => {
    const d = evaluateFreeDelete(input({ userId: CONTROL_ID, plan: 'pro' }))
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe('already_pro')
  })
})

describe('evaluateFreeDelete - fails closed under garbage', () => {
  it('never allows when any single required field is missing', () => {
    const fields: Array<Partial<FreeDeleteInput>> = [
      { userId: null },
      { plan: 'pro' },
      { freeDeleteUsedAt: 'x' },
      { targetSenders: [] },
      { emailCount: null },
    ]
    for (const f of fields) {
      expect(evaluateFreeDelete(input(f)).allowed).toBe(false)
    }
  })

  it('never allows on a wholly empty input', () => {
    const empty = evaluateFreeDelete({
      userId: undefined,
      plan: undefined,
      freeDeleteUsedAt: undefined,
      targetSenders: undefined,
      emailCount: undefined,
    })
    expect(empty.allowed).toBe(false)
  })

  it('a second call after the quota is marked always denies', () => {
    const first = evaluateFreeDelete(input())
    expect(first.allowed).toBe(true)

    // Simulate the consume step writing the timestamp.
    const second = evaluateFreeDelete(input({ freeDeleteUsedAt: new Date().toISOString() }))
    expect(second.allowed).toBe(false)
    if (!second.allowed) expect(second.reason).toBe('quota_used')
  })

  it('cannot be replayed by varying the sender after the quota is spent', () => {
    for (const s of ['a@x.com', 'b@y.com', 'c@z.com']) {
      const d = evaluateFreeDelete(input({ freeDeleteUsedAt: '2026-08-30T00:00:00Z', targetSenders: [s] }))
      expect(d.allowed).toBe(false)
    }
  })

  it('across many random-ish shapes, only the intended shape is ever allowed', () => {
    let allowed = 0
    const counts = [null, 0, -1, 1, 58, 500, 501, NaN]
    const quotas = [null, '2026-01-01']
    const targets: (string[] | null)[] = [null, [], ['a@x.com'], ['a@x.com', 'b@x.com']]
    const plans = ['free', 'pro']
    for (const emailCount of counts)
      for (const freeDeleteUsedAt of quotas)
        for (const targetSenders of targets)
          for (const plan of plans) {
            const d = evaluateFreeDelete(
              input({ emailCount: emailCount as number, freeDeleteUsedAt, targetSenders, plan })
            )
            if (d.allowed) {
              allowed++
              // Every allow must satisfy every invariant.
              expect(plan).toBe('free')
              expect(freeDeleteUsedAt).toBeNull()
              expect(targetSenders).toHaveLength(1)
              expect(emailCount as number).toBeGreaterThan(0)
            }
          }
    // 4 valid counts (1, 58, 500, 501) x 1 quota x 1 target x 1 plan
    expect(allowed).toBe(4)
  })
})

describe('freeDeleteSuccessMessage', () => {
  it('states the real count, the sender, and the price', () => {
    const m = freeDeleteSuccessMessage(3412, 'Grailed')
    expect(m).toContain('3,412')
    expect(m).toContain('Grailed')
    expect(m).toContain('$22.68')
  })

  it('is honest that the freebie was one-off', () => {
    expect(freeDeleteSuccessMessage(58, 'Grailed')).toContain('on us')
  })

  it('handles the singular', () => {
    expect(freeDeleteSuccessMessage(1, 'Grailed')).toContain('1 email from')
    expect(freeDeleteSuccessMessage(1, 'Grailed')).not.toContain('1 emails')
  })
})

describe('in-session consumption tracking', () => {
  beforeEach(() => __resetLocalConsumption())

  it('starts empty', () => {
    expect(wasLocallyConsumed(TREATMENT_ID)).toBe(false)
  })

  it('records and reports a spent quota', () => {
    markLocallyConsumed(TREATMENT_ID)
    expect(wasLocallyConsumed(TREATMENT_ID)).toBe(true)
  })

  it('is per user, not global', () => {
    markLocallyConsumed(TREATMENT_ID)
    expect(wasLocallyConsumed('someone-else')).toBe(false)
  })

  it('handles null and empty ids without recording them', () => {
    markLocallyConsumed('')
    expect(wasLocallyConsumed(null)).toBe(false)
    expect(wasLocallyConsumed(undefined)).toBe(false)
    expect(wasLocallyConsumed('')).toBe(false)
  })

  it('closes the stale-profile hole: gate denies at the action button', () => {
    // The profile is never refetched after a consume, so profile.free_delete_used_at
    // stays null for the rest of the session. Simulate that exact situation.
    const staleProfileValue: string | null = null

    // Before consuming: allowed.
    expect(
      evaluateFreeDelete(input({ freeDeleteUsedAt: staleProfileValue })).allowed
    ).toBe(true)

    markLocallyConsumed(TREATMENT_ID)

    // After consuming, with the SAME stale profile value, the hook substitutes
    // the in-session marker and the gate must now deny.
    const substituted = wasLocallyConsumed(TREATMENT_ID) ? 'consumed-this-session' : staleProfileValue
    const d = evaluateFreeDelete(input({ freeDeleteUsedAt: substituted }))
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe('quota_used')
  })
})
