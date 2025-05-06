import { withBackoff } from './backoff';
import { GmailLabel } from '@/types/gmail';

// Enable/disable detailed logging
export const ENABLE_LABELS_DEBUG = false;

/**
 * Fetches all labels for the authenticated user
 * 
 * @param accessToken - Gmail OAuth access token
 * @returns Array of Gmail labels
 */
export async function fetchLabels(accessToken: string): Promise<GmailLabel[]> {
  if (ENABLE_LABELS_DEBUG) {
    console.log('[Gmail] Fetching labels...');
  }

  return withBackoff(async () => {
    const url = 'https://www.googleapis.com/gmail/v1/users/me/labels';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = new Error('Failed to fetch labels') as any;
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    
    if (!data.labels) {
      console.error('[Gmail] Missing labels in response');
      throw new Error('Invalid response structure from Gmail API');
    }

    if (ENABLE_LABELS_DEBUG) {
      console.log(`[Gmail] Successfully fetched ${data.labels.length} labels`);
    }

    return data.labels as GmailLabel[];
  }, {
    onRetry: (attempt, error) => {
      if (ENABLE_LABELS_DEBUG) {
        console.warn(`[Gmail] Retrying labels fetch (attempt ${attempt}):`, error);
      }
    }
  });
}

/**
 * Fetches all user-created labels (excludes system labels)
 * 
 * @param accessToken - Gmail OAuth access token
 * @returns Array of user-created Gmail labels
 */
export async function fetchUserLabels(accessToken: string): Promise<GmailLabel[]> {
  const allLabels = await fetchLabels(accessToken);
  // Filter out system labels (those with type='system')
  return allLabels.filter(label => label.type !== 'system');
}

/**
 * Stores the labels in localStorage for quick access
 * 
 * @param labels - Array of Gmail labels to store
 */
export function storeLabels(labels: GmailLabel[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('gmail_labels', JSON.stringify(labels));
    
    if (ENABLE_LABELS_DEBUG) {
      console.log(`[Gmail] Stored ${labels.length} labels in localStorage`);
    }
  } catch (error) {
    console.error('[Gmail] Failed to store labels in localStorage:', error);
  }
}

/**
 * Retrieves labels from localStorage
 * 
 * @returns Array of Gmail labels or null if not found
 */
export function getStoredLabels(): GmailLabel[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('gmail_labels');
    if (!stored) return null;
    
    const labels = JSON.parse(stored) as GmailLabel[];
    return labels;
  } catch (error) {
    console.error('[Gmail] Failed to retrieve labels from localStorage:', error);
    return null;
  }
}

/**
 * Fetches labels and stores them in localStorage
 * 
 * @param accessToken - Gmail OAuth access token
 * @returns Array of Gmail labels
 */
export async function fetchAndStoreLabels(accessToken: string): Promise<GmailLabel[]> {
  const labels = await fetchLabels(accessToken);
  storeLabels(labels);
  return labels;
} 