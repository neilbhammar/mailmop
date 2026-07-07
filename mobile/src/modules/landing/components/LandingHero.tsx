import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing, radius } from '@/theme/colors';

export function LandingHero() {
  const { colors } = useTheme();

  return (
    <View style={styles.hero}>
      <View style={[styles.logoBadge, { backgroundColor: colors.blue + '15' }]}>
        <ThemedText style={{ fontSize: 28 }}>📧🧹</ThemedText>
      </View>
      <ThemedText variant="title" style={styles.heroTitle}>
        Clean Your Gmail{'\n'}In Minutes
      </ThemedText>
      <ThemedText variant="subtitle" style={{ color: colors.mutedForeground, textAlign: 'center' }}>
        MailMop groups your inbox by sender so you can bulk delete, unsubscribe, and reclaim storage — privately on your phone.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: { textAlign: 'center', marginBottom: spacing.md },
});
