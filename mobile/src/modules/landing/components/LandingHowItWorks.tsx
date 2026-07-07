import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { howItWorksSteps } from '../content';
import { spacing, radius } from '@/theme/colors';
import { useTheme } from '@/context/ThemeProvider';

export function LandingHowItWorks() {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText variant="title" style={{ fontSize: 22, marginBottom: spacing.lg }}>
        How it works
      </ThemedText>
      {howItWorksSteps.map((item) => (
        <Card key={item.step} style={styles.card}>
          <CardContent style={styles.row}>
            <View style={[styles.stepBadge, { backgroundColor: colors.blue }]}>
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{item.step}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontWeight: '700' }}>{item.title}</ThemedText>
              <ThemedText variant="muted" style={{ marginTop: 4 }}>
                {item.desc}
              </ThemedText>
            </View>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
