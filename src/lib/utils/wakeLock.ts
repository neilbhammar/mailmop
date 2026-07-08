/**
 * wakeLock.ts
 *
 * Shared Screen Wake Lock manager for long-running operations (analysis,
 * bulk delete, mark-as-read, etc.).
 *
 * Why: on mobile (iOS Safari 16.4+, Android Chrome) the screen auto-locking
 * suspends the entire page process and interrupts long runs. Holding a wake
 * lock while an operation is active prevents that. The OS silently releases
 * the lock whenever the page is hidden, so we re-request it on
 * visibilitychange -> visible — the pattern documented on MDN.
 *
 * Ref-counted so overlapping operations share one sentinel; the lock is only
 * released when the last holder finishes. Callers must pair each
 * acquireWakeLock() with exactly one releaseWakeLock().
 */

import { logger } from '@/lib/utils/logger';

let sentinel: WakeLockSentinel | null = null;
let holders = 0;
let visibilityListener: (() => void) | null = null;

async function requestSentinel(): Promise<void> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  if (sentinel && !sentinel.released) return;

  try {
    sentinel = await navigator.wakeLock.request('screen');
    logger.debug('Screen Wake Lock acquired', { component: 'wakeLock' });
    sentinel.addEventListener('release', () => {
      logger.debug('Screen Wake Lock released by system (e.g., page hidden)', { component: 'wakeLock' });
    });
  } catch (err: any) {
    // Non-fatal: low battery / power-save mode can refuse the lock
    logger.warn('Screen Wake Lock request failed', {
      component: 'wakeLock',
      error: `${err?.name}: ${err?.message}`,
    });
  }
}

/**
 * Acquire (or share) the screen wake lock for the duration of an operation.
 */
export async function acquireWakeLock(): Promise<void> {
  holders++;
  if (holders > 1) return; // already held by another operation

  await requestSentinel();

  // Re-acquire whenever the page becomes visible again — the OS releases the
  // lock on hide, and without this the screen would sleep mid-operation after
  // the user briefly switches away and comes back.
  visibilityListener = () => {
    if (document.visibilityState === 'visible' && holders > 0) {
      requestSentinel();
    }
  };
  document.addEventListener('visibilitychange', visibilityListener);
}

/**
 * Release one hold on the wake lock; the sentinel is released when no
 * operations remain.
 */
export async function releaseWakeLock(): Promise<void> {
  holders = Math.max(0, holders - 1);
  if (holders > 0) return;

  if (visibilityListener) {
    document.removeEventListener('visibilitychange', visibilityListener);
    visibilityListener = null;
  }

  if (sentinel) {
    try {
      await sentinel.release();
      logger.debug('Screen Wake Lock released', { component: 'wakeLock' });
    } catch (err: any) {
      logger.warn('Error releasing Screen Wake Lock', {
        component: 'wakeLock',
        error: `${err?.name}: ${err?.message}`,
      });
    } finally {
      sentinel = null;
    }
  }
}
