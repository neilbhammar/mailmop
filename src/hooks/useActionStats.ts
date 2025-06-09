import { useState, useEffect, useCallback } from 'react';
import { getActionStats } from '@/supabase/actions';
import { ACTION_STATS_UPDATED_EVENT } from '@/lib/storage/actionLog';

export function useActionStats(userId?: string) {
  const [stats, setStats] = useState<{
    analyzed: number;
    deleted: number;
    modified: number;
  }>({
    analyzed: 0,
    deleted: 0,
    modified: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const actionStats = await getActionStats(userId);
      setStats({
        analyzed: actionStats.analysis || 0,
        deleted: (actionStats.delete || 0) + (actionStats.delete_with_exceptions || 0),
        modified: (actionStats.mark_as_read || 0) + 
                 (actionStats.unsubscribe || 0) + 
                 (actionStats.modify_label || 0) + 
                 (actionStats.block_sender || 0)
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for action stats updates
  useEffect(() => {
    const handleStatsUpdated = () => {
      console.log('[useActionStats] Received stats update event');
      fetchStats();
    };

    window.addEventListener(ACTION_STATS_UPDATED_EVENT, handleStatsUpdated);
    return () => window.removeEventListener(ACTION_STATS_UPDATED_EVENT, handleStatsUpdated);
  }, [fetchStats]);

  return { stats, isLoading, error };
} 