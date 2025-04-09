import { useState, useEffect } from 'react';
import { GmailStats, fetchGmailStats, getStoredGmailStats } from '@/lib/gmail/fetchGmailStats';

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
  const refreshStats = async (token: string) => {
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
  };

  // If access token is provided, fetch stats on mount
  useEffect(() => {
    if (accessToken) {
      refreshStats(accessToken);
    }
  }, [accessToken]);

  return {
    stats,
    isLoading,
    error,
    refreshStats
  };
} 