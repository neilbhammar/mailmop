import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { globalStats } from '../content';
import { spacing } from '@/theme/colors';

export function LandingStats() {
  const { colors } = useTheme();

  const stats = [
    { label: 'Emails analyzed', value: `${(globalStats.analyzedEmails / 1000).toFixed(0)}k+` },
    { label: 'Emails cleaned', value: `${(globalStats.cleanedEmails / 1000).toFixed(0)}k+` },
    { label: 'Hours saved', value: `${globalStats.hoursSaved.toLocaleString()}+` },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <Card key={stat.label} style={styles.card}>
          <CardContent style={styles.content}>
            <ThemedText style={{ fontWeight: '700', fontSize: 20, color: colors.blue }}>
              {stat.value}
            </ThemedText>
            <ThemedText variant="label" style={{ marginTop: 4, textAlign: 'center' }}>
              {stat.label}
            </ThemedText>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: { flex: 1 },
  content: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center' },
});
