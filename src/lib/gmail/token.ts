// Memory-only state
let memToken: { value: string; exp: number } | null = null;
let refreshTokenState: 'unknown' | 'present' | 'absent' = 'unknown';

// Custom event for token changes
const TOKEN_CHANGE_EVENT = 'mailmop:token-change';

// Helper to emit token change event
function emitTokenChange() {
  window.dispatchEvent(new CustomEvent(TOKEN_CHANGE_EVENT, {
    detail: { key: 'token' }
  }));
}

/**
 * Initialize token state by checking if we have a valid refresh token.
 * This should be called once when the app loads.
 */
export async function initializeTokenState() {
  try {
    const res = await fetch('/api/auth/check-refresh');
    if (!res.ok) {
      refreshTokenState = 'absent';
      emitTokenChange();
      return;
    }
    const { hasRefreshToken: hasToken } = await res.json();
    refreshTokenState = hasToken ? 'present' : 'absent';
    emitTokenChange();
  } catch (error) {
    console.error('[Token] Failed to check refresh token status:', error);
    refreshTokenState = 'absent';
    emitTokenChange();
  }
}

/**
 * Give me a valid access token.
 * - If we already have one in memory and it isn't expired → use it.
 * - Otherwise hit our refresh route to get a new one, then cache it.
 */
export async function getAccessToken(): Promise<string> {
  if (memToken && memToken.exp > Date.now()) {
    return memToken.value;                 // still good
  }

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',                // sends the cookie
  });

  if (!res.ok) {
    // If refresh fails, we should revoke and clean up since the refresh token is invalid
    await revokeAndClearToken();  // This will handle setting hasRefreshToken to false
    throw new Error('Unable to refresh Gmail token');
  }

  const { access_token, expires_in } = await res.json();
  memToken = { value: access_token, exp: Date.now() + expires_in * 1000 };
  refreshTokenState = 'present';
  emitTokenChange();
  return memToken.value;
}

/**
 * Stash a fresh token we just got from /api/auth/exchange
 * so the rest of the app can reuse it.
 */
export function primeAccessToken(token: string, expiresIn: number) {
  memToken = { value: token, exp: Date.now() + expiresIn * 1000 };
  refreshTokenState = 'present';
  emitTokenChange();
}

export function clearAccessToken() {
  memToken = null;
  emitTokenChange();
}

/**
 * Revoke refresh token (server) and clear everything client‑side.
 */
export async function revokeAndClearToken() {
  // 1. Tell server to delete cookie and revoke Google token
  await fetch('/api/auth/revoke', { 
    method: 'POST', 
    credentials: 'include'  // Important: needed to delete the cookie
  }).catch(() => {}); // ignore network errors

  // 2. Drop in‑memory token so UI updates instantly
  clearAccessToken();
  refreshTokenState = 'absent';
  emitTokenChange();  // Ensure UI updates immediately
}

/**
 * Forces a refresh of the access token, bypassing any cached token.
 * Useful when a proactive refresh is needed, e.g., before a long operation
 * if the current token is nearing expiry.
 */
export async function forceRefreshAccessToken(): Promise<string> {
  console.log('[Token] Forcing refresh of access token...');
  // Directly attempt to refresh
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    await revokeAndClearToken();
    throw new Error('Unable to force refresh Gmail token');
  }

  const { access_token, expires_in } = await res.json();
  memToken = { value: access_token, exp: Date.now() + expires_in * 1000 };
  refreshTokenState = 'present';
  emitTokenChange();
  console.log('[Token] Force refresh successful.');
  return memToken.value;
}

/** Peek at the in‑memory token synchronously (no await). */
export function peekAccessToken():
  | { accessToken: string; expiresAt: number }
  | null {
  if (!memToken) return null;
  return { accessToken: memToken.value, expiresAt: memToken.exp };
}

/** How much time (ms) left before the token expires. */
export function tokenTimeRemaining(): number {
  return memToken ? memToken.exp - Date.now() : 0;
}

/**
 * Check if we have a valid refresh token based on our last refresh attempt
 * or OAuth flow. This is used by UI components to determine connection state.
 */
export function hasRefreshToken(): boolean {
  return refreshTokenState === 'present';
}

/**
 * Gets the current raw state of the refresh token.
 */
export function getRefreshTokenState(): 'unknown' | 'present' | 'absent' {
  return refreshTokenState;
}

// --- Functions for testing/debugging purposes ONLY ---

/**
 * Clears the in-memory access token for testing purposes.
 * This does NOT affect the refresh token status.
 */
export function clearAccessTokenOnlyInStorage(): void {
  console.warn('[Token] TEST: Clearing in-memory access token only.');
  memToken = null;
  emitTokenChange(); 
}

/**
 * Expires the current in-memory access token immediately for testing purposes.
 * Sets the expiry to 1 second from now.
 * This does NOT affect the refresh token status.
 */
export function expireAccessTokenInStorage(): void {
  console.warn('[Token] TEST: Expiring in-memory access token.');
  if (memToken) {
    memToken.exp = Date.now() + 10000; // Expire in 1 second
  }
  // Always emit change, even if token didn't exist, to ensure UI consistency if called unexpectedly
  emitTokenChange(); 
}
// --- End testing functions ---
