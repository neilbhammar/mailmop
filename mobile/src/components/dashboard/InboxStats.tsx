import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { fetchGmailStats, GmailStats } from '@/lib/gmail/fetchGmailStats';
import { STORAGE_KEYS } from '@shared/constants/storage';
import { spacing } from '@/theme/colors';
import { eventBus } from '@/lib/events';
import { GMAIL_STATS_UPDATED_EVENT } from '@shared/constants/events';

export function InboxStats() {
  const { colors } = useTheme();
  const { getAccessToken, hasRefreshToken } = useGmailPermissions();
  const [stats, setStats] = useState<GmailStats | null>(null);

  const loadStats = async () => {
    if (!hasRefreshToken) {
      setStats(null);
      return;
    }
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.gmailStats);
      if (cached) setStats(JSON.parse(cached));
      const token = await getAccessToken();
      const fresh = await fetchGmailStats(token);
      setStats(fresh);
      await AsyncStorage.setItem(STORAGE_KEYS.gmailStats, JSON.stringify(fresh));
      eventBus.emit(GMAIL_STATS_UPDATED_EVENT, fresh);
    } catch {
      // keep cached stats if refresh fails
    }
  };

  useEffect(() => {
    loadStats();
    return eventBus.on(GMAIL_STATS_UPDATED_EVENT, loadStats);
  }, [hasRefreshToken]);

  if (!stats) return null;

  return (
    <View style={styles.row}>
      <StatCard label="Total emails" value={stats.totalEmails} colors={colors} />
      <StatCard label="Threads" value={stats.totalThreads} colors={colors} />
    </View>
  );
}

function StatCard({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Card style={styles.card}>
      <CardContent style={styles.cardContent}>
        <ThemedText variant="label">{label}</ThemedText>
        <ThemedText style={{ fontSize: 22, fontWeight: '700', color: colors.blue, marginTop: 4 }}>
          {value.toLocaleString()}
        </ThemedText>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: { flex: 1 },
  cardContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.md },
});
