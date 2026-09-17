import { clearSenderAnalysis } from "./senderAnalysis";
import { clearStoredViewState } from "@/hooks/useViewState";
import { logger } from '@/lib/utils/logger';
import {
  CONNECTED_INBOX_KEY,
  DATA_OWNER_KEY,
  normalizeInboxAddress,
  shouldClearForNewOwner,
  shouldClearForInboxSwitch,
  survivesInboxSwitch,
} from '@/lib/connectedInbox';

/**
 * Wipes every trace of one inbox's analysis from this device.
 *
 * Deliberately does not touch the network. Two different things can prompt a
 * wipe — signing in as a different MailMop user, and connecting a different
 * Gmail account — and they want different treatment of the Google grant, so the
 * callers decide that part.
 */
export async function clearLocalData() {
  logger.debug('Clearing local inbox data', { component: 'userStorage' });

  // Clear localStorage, minus the handful of keys that describe the device
  // rather than the mailbox. Snapshot-clear-restore rather than removing keys
  // one by one, so anything added to the app later is cleared by default.
  const preserved = new Map<string, string>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && survivesInboxSwitch(key)) {
      const value = localStorage.getItem(key);
      if (value !== null) preserved.set(key, value);
    }
  }
  localStorage.clear();
  preserved.forEach((value, key) => localStorage.setItem(key, value));

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear IndexedDB data
  await clearSenderAnalysis();

  // Clear view state (redundant after localStorage.clear(), but explicit for clarity)
  clearStoredViewState();
}

/**
 * Clears all user data from localStorage, sessionStorage, IndexedDB, and revokes
 * the Gmail grant at Google.
 *
 * This is the full disconnect: Google forgets MailMop entirely and coming back
 * means the whole consent screen again. Switching inboxes uses `clearLocalData`
 * plus `dropRefreshToken` instead, which only forgets the token on our side.
 */
export async function clearAllUserData() {
  await clearLocalData();

  // Attempt to clear the HttpOnly session cookie by calling the revoke endpoint
  try {
    logger.debug('Attempting to revoke server session and clear HttpOnly cookie', {
      component: 'userStorage'
    });
    const response = await fetch('/api/auth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Though body is empty, standard to include
      },
    });
    if (response.ok) {
      logger.debug('Server session revoke request successful', {
        component: 'userStorage'
      });
    } else {
      logger.warn('Server session revoke request failed', {
        component: 'userStorage',
        statusText: response.statusText
      });
    }
  } catch (error) {
    logger.error('Error calling /api/auth/revoke', {
      component: 'userStorage',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  logger.debug('All user data cleared (including attempt to clear HttpOnly cookie)', {
    component: 'userStorage'
  });
}

/**
 * The Gmail address we currently hold a token for, or null if none.
 *
 * Survives a reload, which the in-memory access token does not — the app needs
 * to know which mailbox it is attached to before it has fetched anything.
 */
export function getConnectedInbox(): string | null {
  if (typeof window === 'undefined') return null;
  return normalizeInboxAddress(localStorage.getItem(CONNECTED_INBOX_KEY));
}

/** Records the mailbox a freshly granted token belongs to. */
export function setConnectedInbox(email: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeInboxAddress(email);
  if (!normalized) return;
  localStorage.setItem(CONNECTED_INBOX_KEY, normalized);
}

/**
 * Claims the local data for the signed-in MailMop account, clearing it first if
 * it belongs to someone else.
 *
 * Replaces `checkUserMismatch`, which compared the signed-in email against the
 * email of the last analysed mailbox. That comparison only held while the two
 * logins were forced to match; now that one account can clean several inboxes it
 * would fire on every page load and wipe the user's analysis. Identity is the
 * Supabase user id, which is the thing that actually decides whose data this is.
 *
 * @returns true if data was cleared because a different user signed in.
 */
export async function claimLocalDataForUser(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const storedOwner = localStorage.getItem(DATA_OWNER_KEY);
  const mustClear = shouldClearForNewOwner(storedOwner, userId);

  logger.debug('Checking local data ownership', {
    component: 'userStorage',
    hasStoredOwner: !!storedOwner,
    isNewOwner: mustClear,
  });

  if (mustClear) {
    logger.debug('Different MailMop account detected, clearing previous data', {
      component: 'userStorage',
    });
    // A different person on the same browser: the Gmail grant goes too.
    await clearAllUserData();
  }

  // Re-claim after any clear, since clearLocalData empties localStorage.
  localStorage.setItem(DATA_OWNER_KEY, userId);
  return mustClear;
}

/**
 * Reconciles the analysis on disk with the inbox that was just connected.
 *
 * Runs after every successful connection, not just the explicit "switch" button,
 * because the plain "Reconnect Gmail" button opens the same Google account
 * chooser — a user who picks a different account there needs the same clean
 * handoff. Reconnecting the same mailbox keeps everything.
 *
 * @returns true if the previous inbox's data was cleared.
 */
export async function reconcileConnectedInbox(nextInbox: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const storedInbox = getConnectedInbox();
  const mustClear = shouldClearForInboxSwitch(storedInbox, nextInbox);

  if (mustClear) {
    logger.debug('Different inbox connected, clearing previous inbox data', {
      component: 'userStorage',
    });
    // Keep the Google grant: the user may well switch back, and a kept grant
    // makes that two clicks instead of the full consent screen. The owner marker
    // survives the wipe on its own (see `survivesInboxSwitch`).
    await clearLocalData();
  }

  setConnectedInbox(nextInbox);
  return mustClear;
}
