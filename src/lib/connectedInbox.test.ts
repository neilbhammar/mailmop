import { describe, it, expect } from 'vitest'
import {
  survivesInboxSwitch,
  normalizeInboxAddress,
  isSameInbox,
  shouldClearForNewOwner,
  shouldClearForInboxSwitch,
  resolveGmailLinkAddress,
  CONNECTED_INBOX_KEY,
  DATA_OWNER_KEY,
} from './connectedInbox'

/**
 * These rules decide when MailMop erases someone's analysis. Getting them wrong
 * is expensive in both directions: clearing too eagerly throws away work that
 * took ten minutes to produce, and clearing too late shows one inbox's senders
 * while holding another inbox's token — which is how you delete mail from the
 * wrong mailbox. Every "unknown" input therefore has an explicit, tested answer.
 */

describe('normalizeInboxAddress', () => {
  it('lowercases and trims, because Gmail and Supabase disagree on casing', () => {
    expect(normalizeInboxAddress('  Neil@Example.com ')).toBe('neil@example.com')
  })

  it('treats anything that is not a usable address as unknown', () => {
    expect(normalizeInboxAddress('')).toBeNull()
    expect(normalizeInboxAddress('   ')).toBeNull()
    expect(normalizeInboxAddress(null)).toBeNull()
    expect(normalizeInboxAddress(undefined)).toBeNull()
    expect(normalizeInboxAddress(42)).toBeNull()
    expect(normalizeInboxAddress({ email: 'a@b.com' })).toBeNull()
  })
})

describe('isSameInbox', () => {
  it('ignores casing and surrounding whitespace', () => {
    expect(isSameInbox('neil@example.com', 'NEIL@example.com ')).toBe(true)
  })

  it('separates two different addresses', () => {
    expect(isSameInbox('a@example.com', 'b@example.com')).toBe(false)
  })

  it('never calls two unknowns the same inbox', () => {
    // "Unknown equals unknown" would let a switch slip through unnoticed, so
    // an absent address matches nothing at all — not even another absence.
    expect(isSameInbox(null, null)).toBe(false)
    expect(isSameInbox(null, 'a@example.com')).toBe(false)
    expect(isSameInbox('a@example.com', undefined)).toBe(false)
  })
})

describe('shouldClearForNewOwner', () => {
  it('clears when a different MailMop account signs in on this browser', () => {
    expect(shouldClearForNewOwner('user-1', 'user-2')).toBe(true)
  })

  it('keeps data for the same account', () => {
    expect(shouldClearForNewOwner('user-1', 'user-1')).toBe(false)
  })

  it('keeps data when nobody has claimed it yet', () => {
    // Everyone who used MailMop before this shipped has data and no owner
    // marker. Their first load must not wipe them out.
    expect(shouldClearForNewOwner(null, 'user-1')).toBe(false)
    expect(shouldClearForNewOwner(undefined, 'user-1')).toBe(false)
    expect(shouldClearForNewOwner('', 'user-1')).toBe(false)
  })

  it('keeps data when the current user is unknown', () => {
    // A half-loaded session is not evidence of a new owner.
    expect(shouldClearForNewOwner('user-1', null)).toBe(false)
    expect(shouldClearForNewOwner('user-1', undefined)).toBe(false)
    expect(shouldClearForNewOwner('user-1', '')).toBe(false)
  })

  it('compares ids exactly — no casing or trimming games', () => {
    // These are uuids from Supabase, not user input. Two ids that differ only
    // by case are genuinely two different ids.
    expect(shouldClearForNewOwner('abc', 'ABC')).toBe(true)
  })
})

describe('shouldClearForInboxSwitch', () => {
  it('clears when the newly connected inbox is a different mailbox', () => {
    expect(shouldClearForInboxSwitch('personal@gmail.com', 'work@gmail.com')).toBe(true)
  })

  it('keeps the analysis when reconnecting the same mailbox', () => {
    // Reconnecting after a token expiry must not cost the user their analysis.
    expect(shouldClearForInboxSwitch('personal@gmail.com', 'Personal@Gmail.com')).toBe(false)
  })

  it('keeps data when no inbox was recorded before', () => {
    // First ever connection: there is nothing on disk that belongs elsewhere.
    expect(shouldClearForInboxSwitch(null, 'personal@gmail.com')).toBe(false)
    expect(shouldClearForInboxSwitch('', 'personal@gmail.com')).toBe(false)
  })

  it('keeps data when the new inbox is unknown', () => {
    // If the profile lookup failed we do not know what we connected to, and a
    // guess in either direction is worse than leaving the data alone.
    expect(shouldClearForInboxSwitch('personal@gmail.com', null)).toBe(false)
  })
})

describe('the inbox switch sequence', () => {
  /**
   * The bug this pins down, in the order it actually happened:
   *
   *   1. user clicks "Connect a different inbox"
   *   2. switchInbox drops the Gmail token          <- no token from here
   *   3. switchInbox ALSO erased the inbox marker   <- the mistake
   *   4. user picks a different account in Google's popup
   *   5. reconcile asks "is this a different mailbox than the data on disk?"
   *      and, with the marker gone, compares against null and answers "no"
   *
   * Result: 503 senders belonging to the previous mailbox stayed in IndexedDB
   * and on screen, under the new mailbox's token, surviving a page refresh.
   * The marker has to outlive the token for step 5 to have anything to compare.
   */
  it('clears when the marker survived the token being dropped', () => {
    const markerStillOnDisk = 'personal@gmail.com'
    expect(shouldClearForInboxSwitch(markerStillOnDisk, 'work@gmail.com')).toBe(true)
  })

  it('is the null marker that silently kept stale data', () => {
    // Exactly what the broken sequence passed in. Keeping this here so the
    // "false" below reads as the documented failure, not as desired behaviour.
    expect(shouldClearForInboxSwitch(null, 'work@gmail.com')).toBe(false)
  })

  it('still keeps the analysis when the user reconnects the same inbox', () => {
    // The other half of why the marker cannot just always force a clear: a
    // cancelled switch, or a reconnect after expiry, must cost nothing.
    expect(shouldClearForInboxSwitch('personal@gmail.com', 'personal@gmail.com')).toBe(false)
  })
})

describe('resolveGmailLinkAddress', () => {
  it('addresses the inbox that is actually connected', () => {
    // The bug this replaces: links were built from the MailMop login address,
    // which opens the wrong mailbox the moment those two differ.
    expect(resolveGmailLinkAddress('work@gmail.com', 'personal@gmail.com')).toBe(
      'work@gmail.com'
    )
  })

  it('falls back to the account email when no inbox is recorded', () => {
    expect(resolveGmailLinkAddress(null, 'personal@gmail.com')).toBe('personal@gmail.com')
  })

  it('returns null when neither is known, so callers can refuse to open a tab', () => {
    expect(resolveGmailLinkAddress(null, null)).toBeNull()
    expect(resolveGmailLinkAddress('', '')).toBeNull()
  })

  it('normalizes whatever it returns', () => {
    expect(resolveGmailLinkAddress(' Work@Gmail.com ', null)).toBe('work@gmail.com')
  })
})

describe('survivesInboxSwitch', () => {
  it('keeps device preferences that have nothing to do with a mailbox', () => {
    // A dark-mode flip on every inbox switch is a jolt with no upside.
    expect(survivesInboxSwitch('theme')).toBe(true)
    expect(survivesInboxSwitch('deleteMethodPreference')).toBe(true)
    expect(survivesInboxSwitch(DATA_OWNER_KEY)).toBe(true)
  })

  it('clears everything that describes a mailbox', () => {
    expect(survivesInboxSwitch('mailmop:gmail-stats')).toBe(false)
    expect(survivesInboxSwitch('mailmop:actions')).toBe(false)
    expect(survivesInboxSwitch('mailmop_current_analysis')).toBe(false)
    expect(survivesInboxSwitch('mailmop_current_action')).toBe(false)
    expect(survivesInboxSwitch(CONNECTED_INBOX_KEY)).toBe(false)
  })

  it('clears cached Gmail label ids, which belong to one mailbox only', () => {
    // Label ids are per-account: reusing inbox A's ids against inbox B would
    // apply a label the user never picked, or fail outright.
    expect(survivesInboxSwitch('gmail_labels')).toBe(false)
  })

  it('treats an unrecognised key as inbox data', () => {
    // Allowlist, not blocklist: whatever gets added next is cleared until
    // someone decides it is a device preference.
    expect(survivesInboxSwitch('some-future-key')).toBe(false)
  })
})

describe('storage keys', () => {
  it('are namespaced like the rest of MailMop local state', () => {
    expect(CONNECTED_INBOX_KEY).toBe('mailmop:connected-inbox')
    expect(DATA_OWNER_KEY).toBe('mailmop:data-owner')
  })
})
