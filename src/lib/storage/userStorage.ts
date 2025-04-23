import { clearSenderAnalysis } from "./senderAnalysis";

// Constants for localStorage keys
const GMAIL_STATS_KEY = 'mailmop:gmail-stats';

/**
 * Clears all user data from localStorage, sessionStorage, and IndexedDB
 */
export async function clearAllUserData() {
  console.log('[Storage] Clearing all user data...');
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear IndexedDB data
  await clearSenderAnalysis();
  
  console.log('[Storage] All user data cleared');
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