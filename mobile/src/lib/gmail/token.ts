import * as SecureStore from 'expo-secure-store';
import { config } from '@/lib/config';
import { dispatchAppEvent } from '@/lib/events';
import { TOKEN_CHANGE_EVENT } from '@shared/constants/events';
import { logger } from '@/lib/utils/logger';

const REFRESH_TOKEN_KEY = 'mailmop_gmail_refresh_token';

let memToken: { value: string; exp: number } | null = null;
let refreshTokenState: 'unknown' | 'present' | 'absent' = 'unknown';

function emitTokenChange() {
  dispatchAppEvent(TOKEN_CHANGE_EVENT, { key: 'token' });
}

async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function initializeTokenState() {
  try {
    const token = await getStoredRefreshToken();
    refreshTokenState = token ? 'present' : 'absent';
    emitTokenChange();
  } catch (error) {
    logger.error('Failed to check refresh token status', {
      component: 'token',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    refreshTokenState = 'absent';
    emitTokenChange();
  }
}

export async function getAccessToken(): Promise<string> {
  if (memToken && memToken.exp > Date.now()) {
    return memToken.value;
  }

  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    refreshTokenState = 'absent';
    emitTokenChange();
    throw new Error('No Gmail refresh token');
  }

  const res = await fetch(`${config.apiBaseUrl}/api/auth/mobile/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    await revokeAndClearToken();
    throw new Error('Unable to refresh Gmail token');
  }

  const { access_token, expires_in } = await res.json();
  memToken = { value: access_token, exp: Date.now() + expires_in * 1000 };
  refreshTokenState = 'present';
  emitTokenChange();
  return memToken.value;
}

export async function storeRefreshToken(refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  refreshTokenState = 'present';
  emitTokenChange();
}

export function primeAccessToken(token: string, expiresIn: number) {
  memToken = { value: token, exp: Date.now() + expiresIn * 1000 };
  refreshTokenState = 'present';
  emitTokenChange();
}

export function clearAccessToken() {
  memToken = null;
  emitTokenChange();
}

export async function revokeAndClearToken() {
  const refreshToken = await getStoredRefreshToken();
  if (refreshToken) {
    await fetch(`${config.apiBaseUrl}/api/auth/mobile/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {});
  }

  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
  clearAccessToken();
  refreshTokenState = 'absent';
  emitTokenChange();
}

export async function forceRefreshAccessToken(): Promise<string> {
  clearAccessToken();
  return getAccessToken();
}

export function peekAccessToken(): { accessToken: string; expiresAt: number } | null {
  if (!memToken) return null;
  return { accessToken: memToken.value, expiresAt: memToken.exp };
}

export function tokenTimeRemaining(): number {
  return memToken ? memToken.exp - Date.now() : 0;
}

export function hasRefreshToken(): boolean {
  return refreshTokenState === 'present';
}

export function getRefreshTokenState(): 'unknown' | 'present' | 'absent' {
  return refreshTokenState;
}

export async function exchangeAuthCode(code: string, redirectUri: string) {
  const res = await fetch(`${config.apiBaseUrl}/api/auth/mobile/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to exchange authorization code');
  }

  const data = await res.json();
  if (data.refresh_token) {
    await storeRefreshToken(data.refresh_token);
  }
  primeAccessToken(data.access_token, data.expires_in);
  return data;
}
