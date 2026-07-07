import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { TopBar } from '@/components/dashboard/TopBar';
import { useDashboardPreview } from '../hooks/useDashboardPreview';
import { spacing, radius, ThemeColors } from '@/theme/colors';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import { SenderResult } from '@/types/gmail';

/** Demo-only dashboard — no auth, Gmail, or SQLite. */
export function PreviewDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { senders, plan, exitDemo } = useDashboardPreview();
  const [search, setSearch] = useState('');

  const filteredSenders = (senders ?? []).filter(
    (s) =>
      s.senderEmail.toLowerCase().includes(search.toLowerCase()) ||
      s.senderName?.toLowerCase().includes(search.toLowerCase())
  );

  const exitPreview = () => {
    Alert.alert('Exit preview?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Back to landing',
        onPress: () => {
          exitDemo();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.demoBanner, { backgroundColor: colors.amber + '22' }]}>
        <ThemedText variant="label" style={{ color: colors.amber, flex: 1 }}>
          Demo preview — mock data only
        </ThemedText>
        <Button variant="ghost" size="sm" onPress={exitPreview}>
          Exit
        </Button>
      </View>

      <TopBar plan={plan ?? 'free'} onSignOut={exitPreview} onRevokeGmail={async () => {}} demoMode />

      <View style={styles.header}>
        <ThemedText variant="title" style={{ fontSize: 24 }}>
          Declutter Your Inbox
        </ThemedText>
        <ThemedText variant="muted" style={{ marginTop: spacing.xs }}>
          Analyze senders, find clutter, and take back control.
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <StatPill label="Total emails" value="47,832" colors={colors} />
        <StatPill label="Threads" value="12,456" colors={colors} />
      </View>

      <View style={styles.toolbar}>
        <TextInput
          placeholder="Search senders..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          style={[
            styles.search,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
        />
      </View>

      <FlatList
        data={filteredSenders}
        keyExtractor={(item) => item.senderEmail}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SenderRow sender={item} plan={plan ?? 'free'} colors={colors} />
        )}
      />
    </SafeAreaView>
  );
}

function StatPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  return (
    <Card style={styles.statCard}>
      <CardContent style={styles.statContent}>
        <ThemedText variant="label">{label}</ThemedText>
        <ThemedText style={{ fontWeight: '700', fontSize: 18, color: colors.blue, marginTop: 4 }}>
          {value}
        </ThemedText>
      </CardContent>
    </Card>
  );
}

function SenderRow({
  sender,
  plan,
  colors,
}: {
  sender: SenderResult;
  plan: 'free' | 'pro';
  colors: ThemeColors;
}) {
  return (
    <Card style={styles.senderCard}>
      <CardContent>
        <View style={styles.senderHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: '600' }} numberOfLines={1}>
              {sender.senderName || sender.senderEmail}
            </ThemedText>
            <ThemedText variant="muted" numberOfLines={1}>
              {sender.senderEmail}
            </ThemedText>
          </View>
          <View style={styles.countBadge}>
            <ThemedText style={{ fontWeight: '700', color: colors.blue }}>
              {sender.count.toLocaleString()}
            </ThemedText>
            <ThemedText variant="label">emails</ThemedText>
          </View>
        </View>
        <View style={styles.senderMeta}>
          {sender.unread_count > 0 && (
            <ThemedText variant="label" style={{ color: colors.blue }}>
              {sender.unread_count} unread
            </ThemedText>
          )}
          {sender.hasUnsubscribe && (
            <ThemedText variant="label" style={{ color: colors.purple }}>
              Unsubscribe available
            </ThemedText>
          )}
          <ThemedText variant="label">
            Last: {formatRelativeTime(new Date(sender.lastDate))}
          </ThemedText>
        </View>
        <View style={styles.actions}>
          <Button variant="outline" size="sm">
            View in Gmail
          </Button>
          {sender.hasUnsubscribe && (
            <Button variant="secondary" size="sm" style={{ marginLeft: spacing.sm }}>
              Unsubscribe
            </Button>
          )}
          {plan === 'pro' && (
            <Button variant="destructive" size="sm" style={{ marginLeft: spacing.sm }}>
              Delete
            </Button>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1 },
  statContent: { paddingVertical: spacing.md },
  toolbar: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  search: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  listContent: { padding: spacing.lg, paddingTop: 0 },
  senderCard: { marginBottom: spacing.sm },
  senderHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  countBadge: { alignItems: 'flex-end', marginLeft: spacing.md },
  senderMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
});
