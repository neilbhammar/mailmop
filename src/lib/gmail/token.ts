// a variable that lives in memory only
let memToken: { value: string; exp: number } | null = null;

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

  if (!res.ok) throw new Error('Unable to refresh Gmail token');

  const { access_token, expires_in } = await res.json();
  memToken = { value: access_token, exp: Date.now() + expires_in * 1000 };
  return memToken.value;
}

/**
 * Stash a fresh token we just got from /api/auth/exchange
 * so the rest of the app can reuse it.
 */
export function primeAccessToken(token: string, expiresIn: number) {
  memToken = { value: token, exp: Date.now() + expiresIn * 1000 };
}
