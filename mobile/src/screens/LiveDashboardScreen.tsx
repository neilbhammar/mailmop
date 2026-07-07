import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthProvider';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useAnalysis } from '@/context/AnalysisProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { TopBar } from '@/components/dashboard/TopBar';
import { IntroStepper } from '@/components/dashboard/IntroStepper';
import { InboxStats } from '@/components/dashboard/InboxStats';
import { EmailMismatchModal } from '@/components/modals/EmailMismatchModal';
import { getAllSenders } from '@/lib/storage/senderAnalysis';
import { SenderResult } from '@/types/gmail';
import { spacing, radius, ThemeColors } from '@/theme/colors';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';

/** Live dashboard — requires real auth + Gmail. */
export function LiveDashboardScreen() {
  const router = useRouter();
  const { user, isLoading, plan, signOut } = useAuth();
  const { colors } = useTheme();
  const { hasAnalysis, isAnalyzing, checkAnalysisState } = useAnalysis();
  const {
    shouldShowMismatchModal,
    gmailEmail,
    hideMismatchModal,
    clearToken,
  } = useGmailPermissions();

  const [showIntro, setShowIntro] = useState(true);
  const [senders, setSenders] = useState<SenderResult[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (hasAnalysis) {
      setShowIntro(false);
      loadSenders();
    } else {
      setShowIntro(true);
    }
  }, [hasAnalysis]);

  const loadSenders = useCallback(async () => {
    const data = await getAllSenders();
    setSenders(data.sort((a, b) => b.count - a.count));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAnalysisState();
    await loadSenders();
    setRefreshing(false);
  };

  const filteredSenders = senders.filter(
    (s) =>
      s.senderEmail.toLowerCase().includes(search.toLowerCase()) ||
      s.senderName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  if (isLoading || !user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ThemedText>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <TopBar plan={plan} onSignOut={handleSignOut} onRevokeGmail={clearToken} />

      <View style={styles.header}>
        <ThemedText variant="title" style={{ fontSize: 24 }}>
          Declutter Your Inbox
        </ThemedText>
        <ThemedText variant="muted" style={{ marginTop: spacing.xs }}>
          Analyze senders, find clutter, and take back control.
        </ThemedText>
      </View>

      <InboxStats />

      {showIntro || !hasAnalysis ? (
        <View style={styles.introContainer}>
          <IntroStepper
            onComplete={() => {
              setShowIntro(false);
              loadSenders();
            }}
            onCancel={hasAnalysis ? () => setShowIntro(false) : undefined}
          />
        </View>
      ) : (
        <View style={styles.analysisContainer}>
          <View style={styles.toolbar}>
            <TextInput
              placeholder="Search senders..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              style={[
                styles.search,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowIntro(true)}
              style={{ marginLeft: spacing.sm }}
            >
              Re-analyze
            </Button>
          </View>

          {isAnalyzing && (
            <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
              <CardContent>
                <ThemedText style={{ color: colors.blue }}>Analysis in progress...</ThemedText>
              </CardContent>
            </Card>
          )}

          <FlatList
            data={filteredSenders}
            keyExtractor={(item) => item.senderEmail}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText variant="muted" style={{ textAlign: 'center', marginTop: spacing.xxl }}>
                No senders found. Run an analysis to get started.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <SenderRow sender={item} plan={plan} colors={colors} />
            )}
          />
        </View>
      )}

      <EmailMismatchModal
        visible={shouldShowMismatchModal}
        gmailEmail={gmailEmail}
        userEmail={user.email ?? ''}
        onClose={hideMismatchModal}
      />
    </SafeAreaView>
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
  const openInGmail = () => {
    const query = encodeURIComponent(`from:${sender.senderEmail}`);
    Linking.openURL(`https://mail.google.com/mail/u/0/#search/${query}`);
  };

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
          <Button variant="outline" size="sm" onPress={openInGmail}>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  introContainer: { flex: 1, paddingHorizontal: spacing.lg },
  analysisContainer: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  listContent: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
  senderCard: { marginBottom: spacing.sm },
  senderHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  countBadge: { alignItems: 'flex-end', marginLeft: spacing.md },
  senderMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
});
