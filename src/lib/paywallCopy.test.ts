import { describe, it, expect } from 'vitest'
import { buildPaywallCopy, canQuantify, formatFeatureName, type PaywallContext } from './paywallCopy'

const ctx = (over: Partial<PaywallContext> = {}): PaywallContext => ({
  feature: 'delete',
  senderCount: 1,
  emailCount: 3412,
  senderName: 'Grailed',
  ...over,
})

describe('formatFeatureName', () => {
  it('title-cases and de-underscores', () => {
    expect(formatFeatureName('delete')).toBe('Delete')
    expect(formatFeatureName('delete_with_exceptions')).toBe('Delete With Exceptions')
    expect(formatFeatureName('mark_read')).toBe('Mark Read')
  })

  it('survives empty and messy input', () => {
    expect(formatFeatureName('')).toBe('')
    expect(formatFeatureName('__')).toBe('')
  })
})

describe('canQuantify', () => {
  it('quantifies a normal single-sender delete', () => {
    expect(canQuantify(ctx())).toBe(true)
  })

  it('only ever quantifies delete', () => {
    // The other gated features have produced zero converters, and their paywall
    // copy is not what this change is aimed at.
    for (const f of ['mark_read', 'block_sender', 'apply_label', 'delete_with_exceptions']) {
      expect(canQuantify(ctx({ feature: f }))).toBe(false)
    }
  })

  it('refuses to quantify without a usable email count', () => {
    expect(canQuantify(ctx({ emailCount: undefined }))).toBe(false)
    expect(canQuantify(ctx({ emailCount: null }))).toBe(false)
    expect(canQuantify(ctx({ emailCount: 0 }))).toBe(false)
    expect(canQuantify(ctx({ emailCount: -5 }))).toBe(false)
    expect(canQuantify(ctx({ emailCount: NaN }))).toBe(false)
    expect(canQuantify(ctx({ emailCount: Infinity }))).toBe(false)
  })

  it('refuses to quantify without a usable sender count', () => {
    expect(canQuantify(ctx({ senderCount: 0 }))).toBe(false)
    expect(canQuantify(ctx({ senderCount: NaN }))).toBe(false)
  })
})

describe('buildPaywallCopy', () => {
  it('names the sender when there is exactly one', () => {
    const c = buildPaywallCopy(ctx())
    expect(c.title).toBe('Delete 3,412 emails from Grailed')
    expect(c.isQuantified).toBe(true)
  })

  it('counts senders when there are several', () => {
    const c = buildPaywallCopy(ctx({ senderCount: 7, emailCount: 12043, senderName: null }))
    expect(c.title).toBe('Delete 12,043 emails from 7 senders')
  })

  it('ignores a stale sender name when the action targets many senders', () => {
    // activeSingleSender can be left over from a previous single-sender flow.
    // Using it on a bulk action would name the wrong sender.
    const c = buildPaywallCopy(ctx({ senderCount: 7, emailCount: 12043, senderName: 'Grailed' }))
    expect(c.title).toBe('Delete 12,043 emails from 7 senders')
    expect(c.title).not.toContain('Grailed')
  })

  it('falls back to counting when the single sender has no name', () => {
    for (const name of [null, undefined, '', '   ']) {
      const c = buildPaywallCopy(ctx({ senderName: name as string | null }))
      expect(c.title).toBe('Delete 3,412 emails from 1 sender')
      expect(c.title).not.toContain('undefined')
      expect(c.title).not.toContain('null')
    }
  })

  it('handles singular email correctly', () => {
    const c = buildPaywallCopy(ctx({ emailCount: 1 }))
    expect(c.title).toBe('Delete 1 email from Grailed')
  })

  it('formats large numbers with separators', () => {
    expect(buildPaywallCopy(ctx({ emailCount: 218640 })).title).toContain('218,640')
  })

  it('states the price in the subtitle', () => {
    expect(buildPaywallCopy(ctx()).subtitle).toContain('$22.68')
  })

  it('falls back to the original generic copy for non-delete features', () => {
    const c = buildPaywallCopy(ctx({ feature: 'mark_read' }))
    expect(c.title).toBe('Upgrade to Use Mark Read')
    expect(c.subtitle).toContain('Cheaper than a donut.')
    expect(c.isQuantified).toBe(false)
  })

  it('falls back to generic rather than printing a zero or bogus count', () => {
    for (const bad of [0, -1, null, undefined, NaN]) {
      const c = buildPaywallCopy(ctx({ emailCount: bad as number }))
      expect(c.isQuantified).toBe(false)
      expect(c.title).toBe('Upgrade to Use Delete')
    }
  })

  it('never emits an empty, NaN or undefined-bearing headline', () => {
    const cases: PaywallContext[] = [
      ctx(),
      ctx({ senderCount: 7, senderName: null }),
      ctx({ feature: 'block_sender' }),
      ctx({ emailCount: null }),
      ctx({ feature: '', emailCount: null }),
    ]
    for (const c of cases) {
      const copy = buildPaywallCopy(c)
      expect(copy.title.length).toBeGreaterThan(0)
      expect(copy.subtitle.length).toBeGreaterThan(0)
      expect(copy.title).not.toMatch(/NaN|undefined|null/)
      expect(copy.subtitle).not.toMatch(/NaN|undefined|null/)
    }
  })
})
