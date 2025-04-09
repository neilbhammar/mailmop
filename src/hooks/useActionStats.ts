import { useState, useEffect } from 'react';
import { getActionStats } from '@/supabase/actions';

export function useActionStats(userId?: string) {
  const [stats, setStats] = useState<{
    analyzed: number;
    deleted: number;
  }>({
    analyzed: 0,
    deleted: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const actionStats = await getActionStats(userId);
        setStats({
          analyzed: actionStats.analysis || 0,
          deleted: actionStats.delete || 0
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [userId]);

  return { stats, isLoading, error };
} 