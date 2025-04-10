import { useState, useEffect, useCallback } from 'react';
import { GmailStats, fetchGmailStats, getStoredGmailStats, GMAIL_STATS_UPDATED_EVENT } from '@/lib/gmail/fetchGmailStats';

interface UseGmailStatsReturn {
  stats: GmailStats | null;
  isLoading: boolean;
  error: Error | null;
  refreshStats: (accessToken: string) => Promise<void>;
}

/**
 * Hook to manage Gmail statistics (emails and threads count)
 * @param accessToken - Optional Gmail access token. If provided, stats will be fetched on mount
 * @returns Object containing stats, loading state, error state, and refresh function
 */
export function useGmailStats(accessToken?: string): UseGmailStatsReturn {
  const [stats, setStats] = useState<GmailStats | null>(() => getStoredGmailStats());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Function to refresh stats
  const refreshStats = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newStats = await fetchGmailStats(token);
      setStats(newStats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch Gmail stats'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if stats need to be refreshed (over 30 minutes old or non-existent)
  const needsRefresh = useCallback(() => {
    if (!stats) return true;
    
    // Refresh if stats are more than 30 minutes old
    const thirtyMinutesInMs = 30 * 60 * 1000;
    return Date.now() - stats.lastUpdated > thirtyMinutesInMs;
  }, [stats]);

  // If access token is provided, fetch stats on mount or when stale
  useEffect(() => {
    if (accessToken && needsRefresh()) {
      refreshStats(accessToken);
    }
  }, [accessToken, needsRefresh, refreshStats]);
  
  // Listen for Gmail stats update events
  useEffect(() => {
    const handleStatsUpdated = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.stats) {
        console.log('[useGmailStats] Received stats update event');
        setStats(event.detail.stats);
      } else {
        // If the event doesn't contain stats data, fall back to localStorage
        const storedStats = getStoredGmailStats();
        if (storedStats) {
          console.log('[useGmailStats] Using stored stats from localStorage');
          setStats(storedStats);
        }
      }
    };
    
    // Add event listener
    window.addEventListener(GMAIL_STATS_UPDATED_EVENT, handleStatsUpdated);
    
    // Cleanup
    return () => {
      window.removeEventListener(GMAIL_STATS_UPDATED_EVENT, handleStatsUpdated);
    };
  }, []);

  return {
    stats,
    isLoading,
    error,
    refreshStats
  };
} 