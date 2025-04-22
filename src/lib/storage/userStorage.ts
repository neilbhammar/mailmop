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
 * Checks if stored Gmail data belongs to a different user and clears IndexedDB
 */
export async function checkUserMismatch(currentEmail: string): Promise<boolean> {
  console.log('[Storage] Checking user mismatch for:', currentEmail);
  
  // Always clear IndexedDB data first
  console.log('[Storage] Clearing IndexedDB data...');
  await clearSenderAnalysis();
  
  const stats = localStorage.getItem(GMAIL_STATS_KEY);
  if (!stats) {
    console.log('[Storage] No stored Gmail stats found');
    return false;
  }
  
  try {
    const parsed = JSON.parse(stats);
    const storedEmail = parsed.emailAddress;
    const isMismatch = storedEmail !== currentEmail;
    
    console.log('[Storage] Stored email:', storedEmail);
    console.log('[Storage] Current email:', currentEmail);
    console.log('[Storage] Is mismatch:', isMismatch);
    
    return isMismatch;
  } catch (error) {
    console.error('[Storage] Error parsing Gmail stats:', error);
    return false;
  }
}