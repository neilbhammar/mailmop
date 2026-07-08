/**
 * keepAliveAudio.ts
 *
 * Singleton for the quiet looping audio that keeps the page from being
 * throttled/suspended during long-running operations. This is the same
 * `/sample.mp3` keep-alive the analysis flow has always used — centralized
 * here so it also works reliably on mobile Safari.
 *
 * Why a singleton with gesture "priming": iOS (and Chrome's autoplay policy)
 * only allow audio playback from a user gesture. Long operations start from a
 * queue executor, outside the gesture window, so a plain `audio.play()` there
 * gets rejected on iOS — silently losing the keep-alive. The fix is the
 * standard unlock pattern: on the first user gesture anywhere in the app we
 * play-then-pause the element (muted), which marks it user-activated; after
 * that, programmatic play() succeeds for the rest of the session.
 *
 * On iOS, actively-playing audio is also what keeps MailMop running when the
 * user backgrounds Safari or locks the screen — a deliberate trade-off; we set
 * Media Session metadata so the lock-screen widget reads as intentional.
 */

import { logger } from '@/lib/utils/logger';

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let unlockListenersAttached = false;
let active = false; // an operation currently wants the keep-alive playing
let resumeListenerAttached = false;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/sample.mp3');
    audio.loop = true;
    audio.volume = 0.2; // matches the long-standing analysis keep-alive settings
  }
  return audio;
}

function setMediaSession(playing: boolean) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    if (playing) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'MailMop',
        artist: 'Inbox cleaning in progress…',
      });
      navigator.mediaSession.playbackState = 'playing';
    } else {
      navigator.mediaSession.playbackState = 'none';
    }
  } catch {
    // MediaMetadata not supported — cosmetic only
  }
}

/**
 * Attach one-time listeners that unlock audio playback on the first user
 * gesture. Safe to call multiple times; cheap no-op after the first.
 */
export function primeKeepAliveAudio(): void {
  if (unlockListenersAttached || unlocked || typeof window === 'undefined') return;
  unlockListenersAttached = true;

  const unlock = () => {
    if (unlocked) return;
    const el = getAudio();
    el.muted = true;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
        unlocked = true;
        logger.debug('Keep-alive audio unlocked by user gesture', { component: 'keepAliveAudio' });
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('touchend', unlock);
        window.removeEventListener('keydown', unlock);
      })
      .catch(() => {
        // Not a qualifying gesture — keep listening for the next one
        el.muted = false;
      });
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchend', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

/**
 * Start the keep-alive loop. Returns true if playback began.
 */
export async function startKeepAliveAudio(): Promise<boolean> {
  const el = getAudio();
  active = true;

  // If the OS paused us (phone call, etc.) restart when the page is visible
  // again and an operation is still running.
  if (!resumeListenerAttached && typeof document !== 'undefined') {
    resumeListenerAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && active && el.paused) {
        el.play().catch(() => {
          /* will retry on next visibility change */
        });
      }
    });
  }

  try {
    el.muted = false;
    await el.play();
    setMediaSession(true);
    logger.debug('Keep-alive audio playing', { component: 'keepAliveAudio' });
    return true;
  } catch (error) {
    logger.warn('Keep-alive audio playback failed. Operation continues, but background throttling may occur', {
      component: 'keepAliveAudio',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Stop the keep-alive loop. The element is kept around (not destroyed) so its
 * user-activation "unlock" survives for later operations in this session.
 */
export function stopKeepAliveAudio(): void {
  active = false;
  if (!audio) return;
  logger.debug('Stopping keep-alive audio', { component: 'keepAliveAudio' });
  audio.pause();
  audio.currentTime = 0;
  setMediaSession(false);
}
