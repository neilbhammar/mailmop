import { describe, it, expect } from 'vitest'
import { deriveSubscriptionState, extendExpiry, EXTENSION_DAYS } from './subscriptionState'

// Two distinct Stripe-style unix timestamps (seconds) so tests can tell which
// field the derivation used.
const PERIOD_END = 1893456000 // current_period_end
const CANCEL_AT = 1800000000 // cancel_at (different value on purpose)
const iso = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString()

describe('deriveSubscriptionState', () => {
  it('treats a fresh/auto-renewing subscription as auto-renew ON', () => {
    // This is the new-default case: Stripe leaves cancel_at_period_end=false.
    expect(
      deriveSubscriptionState({
        cancel_at: null,
        cancel_at_period_end: false,
        current_period_end: PERIOD_END,
      })
    ).toEqual({ planExpiresAt: iso(PERIOD_END), cancelAtPeriodEnd: false })
  })

  it('treats cancel_at_period_end=true as auto-renew OFF, expiring at period end', () => {
    expect(
      deriveSubscriptionState({
        cancel_at: null,
        cancel_at_period_end: true,
        current_period_end: PERIOD_END,
      })
    ).toEqual({ planExpiresAt: iso(PERIOD_END), cancelAtPeriodEnd: true })
  })

  it('prioritizes an explicit cancel_at date and marks it as OFF', () => {
    expect(
      deriveSubscriptionState({
        cancel_at: CANCEL_AT,
        cancel_at_period_end: true,
        current_period_end: PERIOD_END,
      })
    ).toEqual({ planExpiresAt: iso(CANCEL_AT), cancelAtPeriodEnd: true })
  })

  it('uses cancel_at even when cancel_at_period_end is false', () => {
    expect(
      deriveSubscriptionState({
        cancel_at: CANCEL_AT,
        cancel_at_period_end: false,
        current_period_end: PERIOD_END,
      })
    ).toEqual({ planExpiresAt: iso(CANCEL_AT), cancelAtPeriodEnd: true })
  })

  it('returns null expiry when auto-renewing but current_period_end is missing', () => {
    expect(
      deriveSubscriptionState({
        cancel_at: null,
        cancel_at_period_end: false,
        current_period_end: null,
      })
    ).toEqual({ planExpiresAt: null, cancelAtPeriodEnd: false })
  })

  it('returns null expiry when OFF but current_period_end is missing', () => {
    expect(
      deriveSubscriptionState({
        cancel_at: null,
        cancel_at_period_end: true,
        current_period_end: undefined,
      })
    ).toEqual({ planExpiresAt: null, cancelAtPeriodEnd: true })
  })
})

describe('extendExpiry', () => {
  it('extends an ISO date by 365 days by default', () => {
    expect(extendExpiry('2026-10-01T00:00:00.000Z')).toBe('2027-10-01T00:00:00.000Z')
    expect(EXTENSION_DAYS).toBe(365)
  })

  it('handles leap years across the window', () => {
    // 2027-10-01 + 365 days lands in 2028 (a leap year) on 2028-09-30
    expect(extendExpiry('2027-10-01T00:00:00.000Z')).toBe('2028-09-30T00:00:00.000Z')
  })

  it('accepts a custom number of days', () => {
    expect(extendExpiry('2026-01-01T00:00:00.000Z', 30)).toBe('2026-01-31T00:00:00.000Z')
  })

  it('accepts a Date instance', () => {
    expect(extendExpiry(new Date('2026-10-01T00:00:00.000Z'))).toBe('2027-10-01T00:00:00.000Z')
  })

  it('throws on an invalid date so we never write garbage expiry', () => {
    expect(() => extendExpiry('not-a-date')).toThrow()
    // @ts-expect-error null is invalid input
    expect(() => extendExpiry(null)).toThrow()
  })
})
