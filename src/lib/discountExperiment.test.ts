import { describe, it, expect } from 'vitest'
import {
  assignVariant,
  getOfferForVariant,
  bucketFor,
  VARIANT_BUCKETS,
  type DiscountVariant,
} from './discountExperiment'

/**
 * These tests protect the two properties the experiment's validity depends on:
 * assignment must be stable, and the split must be roughly even. If either breaks,
 * the readout is meaningless.
 */
describe('discount experiment bucketing', () => {
  const sampleIds = Array.from({ length: 20_000 }, (_, i) => `8d02b0f2-b39a-4c2f-880a-${String(i).padStart(12, '0')}`)

  it('is deterministic for the same user id', () => {
    for (const id of sampleIds.slice(0, 200)) {
      expect(assignVariant(id)).toBe(assignVariant(id))
    }
  })

  it('assigns every user to a valid variant', () => {
    const valid = new Set<DiscountVariant>(['control', 'none', 'early25'])
    for (const id of sampleIds.slice(0, 1000)) {
      expect(valid.has(assignVariant(id))).toBe(true)
    }
  })

  it('splits roughly 34/33/33 across a large sample', () => {
    const counts: Record<DiscountVariant, number> = { control: 0, none: 0, early25: 0 }
    for (const id of sampleIds) counts[assignVariant(id)]++

    const pct = (n: number) => (n / sampleIds.length) * 100

    // Allow 2 percentage points of drift. A real skew (a broken hash, a bad
    // modulus) blows past this immediately.
    expect(pct(counts.control)).toBeGreaterThan(32)
    expect(pct(counts.control)).toBeLessThan(36)
    expect(pct(counts.none)).toBeGreaterThan(31)
    expect(pct(counts.none)).toBeLessThan(35)
    expect(pct(counts.early25)).toBeGreaterThan(31)
    expect(pct(counts.early25)).toBeLessThan(35)
  })

  it('produces buckets inside 0-99', () => {
    for (const id of sampleIds.slice(0, 2000)) {
      const b = bucketFor(id)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(100)
    }
  })

  it('bucket boundaries are contiguous and cover 0-99', () => {
    let prev = 0
    for (const { maxExclusive } of VARIANT_BUCKETS) {
      expect(maxExclusive).toBeGreaterThan(prev)
      prev = maxExclusive
    }
    expect(prev).toBe(100)
  })

  it('maps variants to the right promo codes', () => {
    expect(getOfferForVariant('control')?.code).toBe('EARLYBIRD50')
    expect(getOfferForVariant('control')?.percentOff).toBe(50)
    expect(getOfferForVariant('early25')?.code).toBe('EARLY25')
    expect(getOfferForVariant('early25')?.percentOff).toBe(25)
    expect(getOfferForVariant('none')).toBeNull()
  })

  it('shows a discount to about two thirds of users, down from all of them', () => {
    const withOffer = sampleIds.filter((id) => getOfferForVariant(assignVariant(id)) !== null).length
    const pct = (withOffer / sampleIds.length) * 100

    // Was 100% before this experiment. Should now be ~67%, and EARLYBIRD50
    // specifically drops to ~34%, which is the "half as often" goal.
    expect(pct).toBeGreaterThan(64)
    expect(pct).toBeLessThan(70)

    const earlybird = sampleIds.filter((id) => getOfferForVariant(assignVariant(id))?.code === 'EARLYBIRD50').length
    expect((earlybird / sampleIds.length) * 100).toBeLessThan(36)
  })
})
