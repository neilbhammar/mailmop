import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useTheme } from '@/context/ThemeProvider';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing, radius } from '@/theme/colors';

interface TopBarProps {
  plan: 'free' | 'pro';
  onSignOut: () => void;
  onRevokeGmail: () => Promise<void>;
  demoMode?: boolean;
}

export function TopBar({ plan, onSignOut, onRevokeGmail, demoMode }: TopBarProps) {
  const { colors } = useTheme();
  const gmailPermissions = useGmailPermissions();

  const hasRefreshToken = demoMode ? true : gmailPermissions.hasRefreshToken;
  const tokenStatus = demoMode
    ? { state: 'valid' as const }
    : gmailPermissions.tokenStatus;

  const gmailStatus =
    !hasRefreshToken
      ? 'Not connected'
      : tokenStatus.state === 'valid'
        ? 'Connected'
        : tokenStatus.state === 'expiring_soon'
          ? 'Expiring soon'
          : 'Reconnect needed';

  const gmailColor =
    tokenStatus.state === 'valid'
      ? colors.green
      : tokenStatus.state === 'no_connection'
        ? colors.mutedForeground
        : colors.amber;

  const showMenu = () => {
    Alert.alert('Account', undefined, [
      {
        text: 'Revoke Gmail access',
        onPress: () => onRevokeGmail(),
      },
      { text: 'Sign out', style: 'destructive', onPress: onSignOut },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.bar, { borderBottomColor: colors.border }]}>
      <View style={styles.brand}>
        <ThemedText style={{ fontSize: 22 }}>📧🧹</ThemedText>
        <ThemedText style={{ fontWeight: '700', fontSize: 18, marginLeft: spacing.sm }}>
          MailMop
        </ThemedText>
        {plan === 'pro' && (
          <View style={[styles.proBadge, { backgroundColor: colors.blue + '20' }]}>
            <ThemedText style={{ color: colors.blue, fontSize: 11, fontWeight: '700' }}>PRO</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.right}>
        <View style={[styles.gmailBadge, { backgroundColor: gmailColor + '18' }]}>
          <View style={[styles.dot, { backgroundColor: gmailColor }]} />
          <ThemedText variant="label" style={{ color: gmailColor }}>
            {gmailStatus}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={showMenu} style={styles.menuButton}>
          <ThemedText style={{ fontSize: 20 }}>☰</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  brand: { flexDirection: 'row', alignItems: 'center' },
  proBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gmailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  menuButton: { padding: spacing.xs },
});
