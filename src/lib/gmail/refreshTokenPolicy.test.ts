import { describe, it, expect } from 'vitest'
import { resolveRefreshToken, REFRESH_COOKIE } from './refreshTokenPolicy'

/**
 * The bug this encodes a rule for: the exchange route used to write
 * `tokens.refresh_token` into the cookie without checking it existed. When
 * Google omits one, `cookies.set` stringifies undefined and the cookie becomes
 * the literal text "undefined" — every later refresh fails with invalid_grant
 * and the Gmail connection dies with no explanation.
 *
 * Silently keeping the *previous* cookie would be worse still now that the
 * connected mailbox can change: that cookie may belong to the inbox the user is
 * switching away from, and reusing it means holding one inbox's token while the
 * UI names another.
 */

describe('resolveRefreshToken', () => {
  it('stores a real refresh token', () => {
    expect(resolveRefreshToken('1//abc123')).toEqual({
      kind: 'store',
      refreshToken: '1//abc123',
    })
  })

  it('trims the stored value', () => {
    expect(resolveRefreshToken('  1//abc123  ')).toEqual({
      kind: 'store',
      refreshToken: '1//abc123',
    })
  })

  it('rejects a missing token rather than writing a broken cookie', () => {
    expect(resolveRefreshToken(undefined).kind).toBe('reject')
    expect(resolveRefreshToken(null).kind).toBe('reject')
  })

  it('rejects an empty or whitespace token', () => {
    expect(resolveRefreshToken('').kind).toBe('reject')
    expect(resolveRefreshToken('   ').kind).toBe('reject')
  })

  it('rejects the string "undefined", which is what the old bug produced', () => {
    expect(resolveRefreshToken('undefined').kind).toBe('reject')
    expect(resolveRefreshToken('null').kind).toBe('reject')
  })

  it('rejects anything that is not a string', () => {
    expect(resolveRefreshToken(42).kind).toBe('reject')
    expect(resolveRefreshToken({ refresh_token: 'x' }).kind).toBe('reject')
  })

  it('explains itself when it rejects, since the user has to act on it', () => {
    const outcome = resolveRefreshToken(undefined)
    if (outcome.kind !== 'reject') throw new Error('expected a rejection')
    expect(outcome.reason.length).toBeGreaterThan(0)
  })
})

describe('REFRESH_COOKIE', () => {
  it('is the name already deployed, so live sessions survive this change', () => {
    expect(REFRESH_COOKIE).toBe('mm_refresh')
  })
})
