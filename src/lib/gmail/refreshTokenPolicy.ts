/**
 * refreshTokenPolicy.ts
 *
 * One rule, shared by the routes that write and clear the Gmail refresh cookie.
 *
 * Google does not always return a refresh token when an already-granted account
 * re-consents. The exchange route previously assumed it always would and wrote
 * the value straight into the cookie, so an absent token became the string
 * "undefined" and quietly broke the connection until the user disconnected and
 * started over.
 *
 * The alternative — falling back to whatever cookie is already there — is not
 * available to us: with more than one inbox in play, the existing cookie may
 * belong to the account the user is switching *away* from. Holding the old
 * inbox's token while the UI names the new one is the one failure mode that can
 * send a delete to the wrong mailbox, so a missing token is a hard, visible
 * failure instead.
 */

/** Cookie holding the Gmail refresh token. Unchanged, so live sessions survive. */
export const REFRESH_COOKIE = 'mm_refresh'

export type RefreshTokenOutcome =
  | { kind: 'store'; refreshToken: string }
  | { kind: 'reject'; reason: string }

/**
 * Values that are technically strings but mean "nothing came back" — the shapes
 * JavaScript's own stringification produces when a field is missing.
 */
const NOT_A_TOKEN = new Set(['undefined', 'null', 'false', '[object Object]'])

/**
 * Decides whether Google's response contains a token worth storing.
 *
 * Rejection is recoverable: the caller clears the cookie and the user reconnects,
 * which is a visible two-click fix rather than a connection that looks fine and
 * fails on the next refresh.
 */
export function resolveRefreshToken(returned: unknown): RefreshTokenOutcome {
  if (typeof returned !== 'string') {
    return {
      kind: 'reject',
      reason: 'Google did not return a refresh token. Please connect Gmail again.',
    }
  }

  const trimmed = returned.trim()
  if (trimmed.length === 0 || NOT_A_TOKEN.has(trimmed)) {
    return {
      kind: 'reject',
      reason: 'Google did not return a refresh token. Please connect Gmail again.',
    }
  }

  return { kind: 'store', refreshToken: trimmed }
}
