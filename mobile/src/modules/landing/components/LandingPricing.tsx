import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/context/ThemeProvider';
import { pricingPlans } from '../content';
import { spacing } from '@/theme/colors';

export function LandingPricing() {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText variant="title" style={{ fontSize: 22, marginBottom: spacing.lg }}>
        Simple pricing
      </ThemedText>
      <View style={styles.row}>
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            style={
              plan.highlighted
                ? { flex: 1, borderColor: colors.blue, borderWidth: 2 }
                : { flex: 1 }
            }
          >
            <CardContent>
              <ThemedText
                style={{
                  fontWeight: '700',
                  fontSize: 18,
                  color: plan.highlighted ? colors.blue : colors.foreground,
                }}
              >
                {plan.name}
              </ThemedText>
              {plan.features.map((f) => (
                <ThemedText key={f} variant="muted" style={{ marginTop: spacing.xs }}>
                  • {f}
                </ThemedText>
              ))}
              <ThemedText style={{ fontSize: 24, fontWeight: '700', marginTop: spacing.sm }}>
                {plan.price}
              </ThemedText>
            </CardContent>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  card: { flex: 1 },
});
