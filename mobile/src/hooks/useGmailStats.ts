import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { fetchGmailStats, GmailStats } from '@/lib/gmail/fetchGmailStats';
import { STORAGE_KEYS } from '@shared/constants/storage';

export function useGmailStats() {
  const { getAccessToken, hasRefreshToken } = useGmailPermissions();
  const [stats, setStats] = useState<GmailStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStats = useCallback(async () => {
    if (!hasRefreshToken) {
      setStats(null);
      return;
    }
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const fresh = await fetchGmailStats(token);
      setStats(fresh);
      await AsyncStorage.setItem(STORAGE_KEYS.gmailStats, JSON.stringify(fresh));
    } catch {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.gmailStats);
      if (cached) setStats(JSON.parse(cached));
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, hasRefreshToken]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return { stats, isLoading, refreshStats };
}

export type { GmailStats };
