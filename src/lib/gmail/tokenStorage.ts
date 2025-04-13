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
 * Gets the stored Gmail token if it exists from sessionStorage
 */
export function getStoredToken(): GmailToken | null {
  if (typeof window === 'undefined') return null;

  const stored = sessionStorage.getItem(TOKEN_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as GmailToken;
  } catch {
    return null;
  }
}

/**
 * Stores a new Gmail token with expiry in sessionStorage
 */
export function storeGmailToken(accessToken: string, expiresIn: number): void {
  if (typeof window === 'undefined') return;

  const token: GmailToken = {
    accessToken,
    expiresAt: Date.now() + (expiresIn * 1000)
  };

  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
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
 * Revokes the token with Google's servers and removes it from storage
 */
export async function clearToken(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Get the current token before clearing storage
  const token = getStoredToken();
  if (token?.accessToken) {
    try {
      // Tell Google to revoke the token
      console.log('[Gmail] Revoking access token with Google...');
      const response = await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token.accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.ok) {
        console.log('[Gmail] Token successfully revoked with Google');
      } else {
        console.error('[Gmail] Failed to revoke token with Google:', await response.text());
      }
    } catch (error) {
      console.error('[Gmail] Error revoking token with Google:', error);
    }
  }

  // Remove from storage regardless of revoke success
  sessionStorage.removeItem(TOKEN_KEY);
  notifyStorageChange(TOKEN_KEY);
} 