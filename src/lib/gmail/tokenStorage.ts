import { GmailToken } from '@/types/gmail';

const TOKEN_KEY = 'gmail_token';
const ANALYSIS_KEY = 'email_analysis';

/**
 * Securely stores Gmail access token with expiration
 */
export function storeGmailToken(accessToken: string, expiresIn: number): void {
  const token: GmailToken = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000, // Convert seconds to milliseconds
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

/**
 * Retrieves stored Gmail token if it exists
 */
export function getStoredToken(): GmailToken | null {
  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (!storedToken) return null;
  
  try {
    return JSON.parse(storedToken) as GmailToken;
  } catch {
    localStorage.removeItem(TOKEN_KEY); // Clear invalid token
    return null;
  }
}

/**
 * Checks if stored token exists and is still valid
 */
export function isTokenValid(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  
  return token.expiresAt > Date.now();
}

/**
 * Checks if email analysis data exists in localStorage
 */
export function hasStoredAnalysis(): boolean {
  const analysis = localStorage.getItem(ANALYSIS_KEY);
  return analysis !== null;
}

/**
 * Removes stored Gmail token
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
} 