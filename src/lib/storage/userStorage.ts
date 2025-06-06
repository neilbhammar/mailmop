import { clearSenderAnalysis } from "./senderAnalysis";
import { logger } from '@/lib/utils/logger';

// Constants for localStorage keys
const GMAIL_STATS_KEY = 'mailmop:gmail-stats';

/**
 * Clears all user data from localStorage, sessionStorage, IndexedDB, and attempts to clear HttpOnly cookie.
 */
export async function clearAllUserData() {
  logger.debug('Clearing all user data', { component: 'userStorage' });
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear IndexedDB data
  await clearSenderAnalysis();

  // Attempt to clear the HttpOnly session cookie by calling the revoke endpoint
  try {
    logger.debug('Attempting to revoke server session and clear HttpOnly cookie', { 
      component: 'userStorage' 
    });
    const response = await fetch('/api/auth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Though body is empty, standard to include
      },
    });
    if (response.ok) {
      logger.debug('Server session revoke request successful', { 
        component: 'userStorage' 
      });
    } else {
      logger.warn('Server session revoke request failed', { 
        component: 'userStorage',
        statusText: response.statusText 
      });
    }
  } catch (error) {
    logger.error('Error calling /api/auth/revoke', { 
      component: 'userStorage',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  logger.debug('All user data cleared (including attempt to clear HttpOnly cookie)', { 
    component: 'userStorage' 
  });
}

/**
 * Checks if stored Gmail data belongs to a different user
 * Returns true if there's a mismatch (different user), false if same user or no previous user
 */
export async function checkUserMismatch(currentEmail: string): Promise<boolean> {
  logger.debug('Checking user mismatch', { 
    component: 'userStorage',
    currentEmail 
  });
  
  // First, check if we have any stored data
  const stats = localStorage.getItem(GMAIL_STATS_KEY);
  if (!stats) {
    logger.debug('No stored Gmail stats found - first time user', { 
      component: 'userStorage' 
    });
    return false;
  }
  
  try {
    // Parse the stored data to get the previous user's email
    const parsed = JSON.parse(stats);
    const storedEmail = parsed.emailAddress;
    
    // Compare the stored email with current user's email
    const isMismatch = storedEmail !== currentEmail;
    
    logger.debug('User mismatch check result', { 
      component: 'userStorage',
      storedEmail,
      currentEmail,
      isMismatch
    });
    
    // Only clear data if we detect a different user
    if (isMismatch) {
      logger.debug('Different user detected, clearing previous data', { 
        component: 'userStorage' 
      });
      await clearAllUserData();
    } else {
      logger.debug('Same user detected, preserving data', { 
        component: 'userStorage' 
      });
    }
    
    return isMismatch;
  } catch (error) {
    logger.error('Error parsing Gmail stats', { 
      component: 'userStorage',
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}