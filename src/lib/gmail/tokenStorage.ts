import { GmailToken } from '@/types/gmail';

const TOKEN_KEY = 'gmail_token';

// Custom event for state changes
export const STORAGE_CHANGE_EVENT = 'mailmop:storage-change';

// Helper to notify components of changes
function notifyStorageChange(key: string) {
  if (typeof window === 'undefined') return;
  
  window.dispatchEvent(
    new CustomEvent(STORAGE_CHANGE_EVENT, { 
      detail: { key } 
    })
  );
}

/**
 * Gets the stored Gmail token if it exists
 */
export function getStoredToken(): GmailToken | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as GmailToken;
  } catch {
    return null;
  }
}

/**
 * Stores a new Gmail token with expiry
 */
export function storeGmailToken(accessToken: string, expiresIn: number): void {
  if (typeof window === 'undefined') return;

  const token: GmailToken = {
    accessToken,
    expiresAt: Date.now() + (expiresIn * 1000)
  };

  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  notifyStorageChange(TOKEN_KEY);
}

/**
 * Checks if the stored token is still valid
 */
export function isTokenValid(): boolean {
  const token = getStoredToken();
  if (!token) return false;

  return Date.now() < token.expiresAt;
}

/**
 * Clears the stored Gmail token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  notifyStorageChange(TOKEN_KEY);
} 