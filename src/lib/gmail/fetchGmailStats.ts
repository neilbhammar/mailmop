/**
 * Type for Gmail statistics we want to track
 */
export interface GmailStats {
  emailAddress: string;
  totalEmails: number;
  totalThreads: number;
  lastUpdated: number; // timestamp
}

/**
 * Key used for storing Gmail stats in localStorage
 */
const GMAIL_STATS_KEY = 'mailmop:gmail-stats';

/**
 * Custom event for Gmail stats updates
 */
export const GMAIL_STATS_UPDATED_EVENT = 'mailmop:gmail-stats-updated';

/**
 * Helper to notify components of stats updates
 */
function notifyStatsUpdated(stats: GmailStats) {
  if (typeof window === 'undefined') return;
  
  // Dispatch a custom event with the stats data
  window.dispatchEvent(new CustomEvent(GMAIL_STATS_UPDATED_EVENT, { 
    detail: { stats } 
  }));
}

/**
 * Fetches Gmail statistics (total emails and threads) for the authenticated user
 * @param accessToken - The Gmail OAuth access token
 * @returns The Gmail statistics including email counts and threads
 */
export async function fetchGmailStats(accessToken: string): Promise<GmailStats> {
  // First get the user's profile which includes their email
  const profileResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch Gmail profile');
  }

  const profile = await profileResponse.json();
  
  // Then get the message and thread counts - using the same profile endpoint
  // since it already contains the counts we need
  const stats: GmailStats = {
    emailAddress: profile.emailAddress,
    totalEmails: profile.messagesTotal || 0,
    totalThreads: profile.threadsTotal || 0,
    lastUpdated: Date.now(),
  };

  // Store in localStorage
  localStorage.setItem(GMAIL_STATS_KEY, JSON.stringify(stats));
  
  // Notify components that stats have been updated
  notifyStatsUpdated(stats);

  return stats;
}

/**
 * Gets Gmail stats from localStorage if they exist
 * @returns The stored Gmail stats or null if not found
 */
export function getStoredGmailStats(): GmailStats | null {
  const stored = localStorage.getItem(GMAIL_STATS_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as GmailStats;
  } catch {
    return null;
  }
}

/**
 * Clears stored Gmail stats from localStorage
 */
export function clearStoredGmailStats(): void {
  localStorage.removeItem(GMAIL_STATS_KEY);
} 