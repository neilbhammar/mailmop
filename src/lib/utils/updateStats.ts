/**
 * updateStats.ts
 * 
 * Centralized utility for refreshing all inbox statistics after action completion.
 * This ensures both Gmail API stats and Supabase action stats are updated
 * to provide real-time feedback to users.
 */

import { fetchGmailStats, GMAIL_STATS_UPDATED_EVENT } from '@/lib/gmail/fetchGmailStats';
import { ACTION_STATS_UPDATED_EVENT } from '@/lib/storage/actionLog';
import { peekAccessToken } from '@/lib/gmail/token';
import { logger } from '@/lib/utils/logger';

/**
 * Refreshes both Gmail API stats and action stats after an action completes.
 * This triggers UI updates across the dashboard to show real-time progress.
 * 
 * @param actionType - The type of action that was completed (for logging)
 * @param accessToken - Optional access token. If not provided, will attempt to peek current token
 */
export async function updateAllStats(
  actionType?: string,
  accessToken?: string
): Promise<void> {
  logger.debug('Updating all stats after action completion', { 
    component: 'updateAllStats',
    actionType 
  });

  try {
    // 1. Refresh action stats (Supabase data)
    logger.debug('Triggering action stats refresh', { component: 'updateAllStats' });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ACTION_STATS_UPDATED_EVENT));
    }

    // 2. Refresh Gmail API stats (Gmail data)
    const token = accessToken || peekAccessToken()?.accessToken;
    if (token) {
      logger.debug('Refreshing Gmail stats from API', { component: 'updateAllStats' });
      await fetchGmailStats(token);
      // fetchGmailStats automatically dispatches GMAIL_STATS_UPDATED_EVENT
    } else {
      logger.warn('No access token available for Gmail stats refresh', { 
        component: 'updateAllStats' 
      });
    }

    logger.debug('Successfully updated all stats', { 
      component: 'updateAllStats',
      actionType 
    });

  } catch (error) {
    logger.error('Failed to update stats after action completion', { 
      component: 'updateAllStats',
      actionType,
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't throw - stats update failure shouldn't break the main action
  }
}

/**
 * Convenience function to update stats after successful action completion.
 * This is the main function that action hooks should call.
 * 
 * @param actionType - The type of action that completed
 */
export async function refreshStatsAfterAction(actionType: string): Promise<void> {
  logger.debug('Refreshing stats after successful action', { 
    component: 'updateAllStats',
    actionType 
  });
  
  await updateAllStats(actionType);
} 