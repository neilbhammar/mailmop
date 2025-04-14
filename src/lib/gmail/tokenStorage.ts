import { GmailToken } from '@/types/gmail';

const TOKEN_KEY = 'gmail_token';

// Custom event for state changes
export const STORAGE_CHANGE_EVENT = 'mailmop:storage-change';

// Helper to dispatch storage change events
function notifyStorageChange(key: string) {
  if (typeof window === 'undefined') return;
  
  const event = new CustomEvent(STORAGE_CHANGE_EVENT, { 
    detail: { key } 
  });
  window.dispatchEvent(event);
}

/**
 * Gets the stored Gmail token if it exists from sessionStorage
 */
export function getStoredToken(): GmailToken | null {
  if (typeof window === 'undefined') return null;

  const stored = sessionStorage.getItem(TOKEN_KEY);
  if (!stored) return null;

  try {
    const token = JSON.parse(stored) as GmailToken;
    // Check if token is expired
    if (token.expiresAt < Date.now()) {
      // Just remove the token but don't clear other data
      sessionStorage.removeItem(TOKEN_KEY);
      notifyStorageChange(TOKEN_KEY);
      return null;
    }
    return token;
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
 * Revokes the token with Google's servers and removes it from storage
 * Does not clear other user data
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

  // Only remove the token, preserve other data
  sessionStorage.removeItem(TOKEN_KEY);
  notifyStorageChange(TOKEN_KEY);
} 