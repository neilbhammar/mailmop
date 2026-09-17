/**
 * connectedInbox.ts
 *
 * MailMop signs you in twice, and the two logins are unrelated:
 *
 *   1. Supabase Google OAuth — who you are. Owns your plan and your Stripe IDs.
 *   2. The Gmail consent popup  — which mailbox we may touch. Owns the refresh
 *      token in the `mm_refresh` cookie.
 *
 * MailMop used to force those two to be the same address and revoked the Gmail
 * token when they differed. They no longer have to match, which is what lets one
 * account clean several inboxes — so the address in login #2, the "connected
 * inbox", is now its own piece of state rather than something derivable from the
 * session.
 *
 * Only one inbox is connected at a time. Connecting a different one clears the
 * previous inbox's analysis from the device, because every local store here
 * (IndexedDB senders, cached stats, action history) assumes a single mailbox and
 * has no column to tell two apart.
 *
 * The rules below are pure so they can be tested exhaustively; the localStorage
 * reads and writes live in `lib/storage/userStorage.ts`.
 */

/**
 * localStorage key naming the inbox whose analysis is on this device.
 *
 * NOT "the inbox we currently hold a token for" — those two come apart, and
 * conflating them cost us a real bug. Between dropping the old token and the
 * user picking an account in Google's popup we hold no token at all, but the
 * previous inbox's senders are still sitting in IndexedDB, and this marker is
 * the only record of who they belong to. Erase it early and the reconcile step
 * compares against null, concludes there is nothing to invalidate, and leaves
 * one mailbox's analysis on screen under another mailbox's token.
 *
 * So the rule is: this key lives exactly as long as the data does. It is set
 * when an inbox connects and cleared only by the wipe itself.
 */
export const CONNECTED_INBOX_KEY = 'mailmop:connected-inbox'

/** localStorage key holding the Supabase user id the local data belongs to. */
export const DATA_OWNER_KEY = 'mailmop:data-owner'

/**
 * Reduces a stored or fetched value to a comparable address, or null when there
 * is nothing usable there. Everything that compares addresses goes through this,
 * so a stray space or a capital letter can never read as a different mailbox.
 */
export function normalizeInboxAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Whether two values name the same mailbox.
 *
 * An unknown address matches nothing — not even another unknown. Two nulls
 * reading as "same" would let an inbox change slip past the guard below, and the
 * cost of that is showing inbox A's senders while holding inbox B's token.
 */
export function isSameInbox(a: unknown, b: unknown): boolean {
  const left = normalizeInboxAddress(a)
  const right = normalizeInboxAddress(b)
  if (!left || !right) return false
  return left === right
}

/**
 * Whether local data belongs to someone else and must be cleared.
 *
 * Keyed on the Supabase user id rather than an email address. The previous
 * version of this check compared the signed-in email against the email of the
 * last analysed mailbox — a comparison that was only ever true by coincidence,
 * and which starts wiping data on every page load once those two are allowed to
 * differ.
 *
 * Silence is not evidence: no recorded owner (every user who predates this
 * marker) and no current user (a session still loading) both mean "leave it".
 */
export function shouldClearForNewOwner(
  storedOwnerId: unknown,
  currentUserId: unknown
): boolean {
  if (typeof storedOwnerId !== 'string' || storedOwnerId.length === 0) return false
  if (typeof currentUserId !== 'string' || currentUserId.length === 0) return false
  return storedOwnerId !== currentUserId
}

/**
 * Whether connecting `nextInbox` invalidates the analysis already on disk.
 *
 * This is the single place the inbox-switch rule is enforced, and it runs after
 * every successful connection rather than only behind the "Switch inbox" button.
 * That matters because the plain "Reconnect Gmail" button opens the same Google
 * account chooser: a user who reconnects and picks a different account gets the
 * same clean handoff, without anything having to know which button they pressed.
 *
 * Reconnecting the same mailbox — the common case, after a token expires — keeps
 * the analysis, which is the whole point of not clearing eagerly.
 */
export function shouldClearForInboxSwitch(
  storedInbox: unknown,
  nextInbox: unknown
): boolean {
  const stored = normalizeInboxAddress(storedInbox)
  const next = normalizeInboxAddress(nextInbox)
  // Nothing on disk to invalidate, or no idea what we just connected to.
  if (!stored || !next) return false
  return stored !== next
}

/**
 * The mailbox a "View in Gmail" link should open.
 *
 * Deep links used to be built from the Supabase login address. That was
 * indistinguishable from correct while the two addresses were forced to match,
 * and sends you to the wrong mailbox the moment they are not — so the connected
 * inbox wins, and the login address is only a fallback for the brief window
 * before the first Gmail profile lookup returns.
 */
export function resolveGmailLinkAddress(
  connectedInbox: unknown,
  accountEmail: unknown
): string | null {
  return normalizeInboxAddress(connectedInbox) ?? normalizeInboxAddress(accountEmail)
}

/**
 * localStorage keys that describe the device or the person, not the mailbox.
 *
 * Everything else in localStorage is inbox data — cached Gmail stats, cached
 * label ids, per-sender action history, in-flight operation logs — and all of it
 * is wrong the moment a different mailbox is connected, so the wipe is a blunt
 * `localStorage.clear()` and this is the short list that gets put back.
 *
 * The Supabase session is not here because it lives in cookies (`@supabase/ssr`
 * stores it there so middleware can read it), which is why clearing localStorage
 * does not sign anyone out.
 */
const DEVICE_PREFERENCE_KEYS = new Set([
  'theme', // next-themes; a dark-mode flip on every switch is a needless jolt
  'deleteMethodPreference', // trash vs permanent — a choice about behaviour
  DATA_OWNER_KEY, // re-established immediately anyway; skip the churn
])

/**
 * Whether a localStorage key should survive connecting a different inbox.
 *
 * Deliberately an allowlist. A new key added anywhere in the app is inbox data
 * until someone decides otherwise, which is the safe default — keeping stale
 * data is how you end up showing one mailbox's senders next to another's.
 */
export function survivesInboxSwitch(key: string): boolean {
  return DEVICE_PREFERENCE_KEYS.has(key)
}

/**
 * What the confirm dialog says before disconnecting.
 *
 * Deliberately concrete about the cost: analysis is cheap to redo but expensive
 * to wait for, and users should not discover that after the fact.
 */
export function inboxSwitchWarning(currentInbox: unknown): string {
  const inbox = normalizeInboxAddress(currentInbox)
  const subject = inbox ? `the analysis for ${inbox}` : 'the analysis on this device'
  return (
    `MailMop works on one inbox at a time. If you connect a different Gmail account, ` +
    `${subject} will be cleared from this device — you can re-analyze it anytime by ` +
    `connecting it again. Nothing in Gmail itself is changed or deleted.`
  )
}
