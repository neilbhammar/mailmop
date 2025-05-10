import { clearSenderAnalysis } from "./senderAnalysis";

// Constants for localStorage keys
const GMAIL_STATS_KEY = 'mailmop:gmail-stats';

/**
3 * Clears all user data from localStorage, sessionStorage, IndexedDB, and attempts to clear HttpOnly cookie.
 */
export async function clearAllUserData() {
  console.log('[Storage] Clearing all user data...');
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear IndexedDB data
  await clearSenderAnalysis();

  // Attempt to clear the HttpOnly session cookie by calling the revoke endpoint
  try {
    console.log('[Storage] Attempting to revoke server session and clear HttpOnly cookie...');
    const response = await fetch('/api/auth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Though body is empty, standard to include
      },
    });
    if (response.ok) {
      console.log('[Storage] Server session revoke request successful.');
    } else {
      console.warn('[Storage] Server session revoke request failed:', response.statusText);
    }
  } catch (error) {
    console.error('[Storage] Error calling /api/auth/revoke:', error);
  }
  
  console.log('[Storage] All user data cleared (including attempt to clear HttpOnly cookie)');
}

/**
 * Checks if stored Gmail data belongs to a different user
 * Returns true if there's a mismatch (different user), false if same user or no previous user
 */
export async function checkUserMismatch(currentEmail: string): Promise<boolean> {
  console.log('[Storage] Checking user mismatch for:', currentEmail);
  
  // First, check if we have any stored data
  const stats = localStorage.getItem(GMAIL_STATS_KEY);
  if (!stats) {
    console.log('[Storage] No stored Gmail stats found - first time user');
    return false;
  }
  
  try {
    // Parse the stored data to get the previous user's email
    const parsed = JSON.parse(stats);
    const storedEmail = parsed.emailAddress;
    
    // Compare the stored email with current user's email
    const isMismatch = storedEmail !== currentEmail;
    
    console.log('[Storage] Stored email:', storedEmail);
    console.log('[Storage] Current email:', currentEmail);
    console.log('[Storage] Is mismatch:', isMismatch);
    
    // Only clear data if we detect a different user
    if (isMismatch) {
      console.log('[Storage] Different user detected, clearing previous data');
      await clearAllUserData();
    } else {
      console.log('[Storage] Same user detected, preserving data');
    }
    
    return isMismatch;
  } catch (error) {
    console.error('[Storage] Error parsing Gmail stats:', error);
    return false;
  }
}