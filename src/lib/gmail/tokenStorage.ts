import { GmailToken } from '@/types/gmail';

const TOKEN_KEY = 'gmail_token';
const ANALYSIS_KEY = 'email_analysis';

// Custom event for state changes
export const STORAGE_CHANGE_EVENT = 'mailmop:storage-change';

// Helper to notify of storage changes
function notifyStorageChange(key: string) {
  if (typeof window === 'undefined') return;
  
  // Dispatch a custom event that works in the current tab
  window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
}

/**
 * Securely stores Gmail access token with expiration
 */
export function storeGmailToken(accessToken: string, expiresIn: number): void {
  if (typeof window === 'undefined') return;

  const token: GmailToken = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000, // Convert seconds to milliseconds
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  notifyStorageChange(TOKEN_KEY);
}

/**
 * Retrieves stored Gmail token if it exists
 */
export function getStoredToken(): GmailToken | null {
  if (typeof window === 'undefined') return null;

  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (!storedToken) return null;
  
  try {
    return JSON.parse(storedToken) as GmailToken;
  } catch {
    localStorage.removeItem(TOKEN_KEY); // Clear invalid token
    notifyStorageChange(TOKEN_KEY);
    return null;
  }
}

/**
 * Checks if stored token exists and is still valid
 */
export function isTokenValid(): boolean {
  if (typeof window === 'undefined') return false;

  const token = getStoredToken();
  if (!token) return false;
  
  return token.expiresAt > Date.now();
}

/**
 * Checks if email analysis data exists in localStorage
 */
export function hasStoredAnalysis(): boolean {
  if (typeof window === 'undefined') return false;

  const analysis = localStorage.getItem(ANALYSIS_KEY);
  return analysis !== null;
}

/**
 * Stores dummy analysis data for testing
 */
export function storeDummyAnalysis(): void {
  if (typeof window === 'undefined') return;

  const dummyData = {
    timestamp: Date.now(),
    senders: [
      {
        email: 'test@example.com',
        count: 10,
        lastEmail: new Date().toISOString()
      }
    ]
  };
  
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(dummyData));
  notifyStorageChange(ANALYSIS_KEY);
}

/**
 * Removes stored Gmail token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  notifyStorageChange(TOKEN_KEY);
}

/**
 * Clears analysis data
 */
export function clearAnalysis(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(ANALYSIS_KEY);
  notifyStorageChange(ANALYSIS_KEY);
} 