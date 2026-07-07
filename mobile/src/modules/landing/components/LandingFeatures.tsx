import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { landingFeatures } from '../content';
import { spacing } from '@/theme/colors';

export function LandingFeatures() {
  return (
    <View style={styles.section}>
      <ThemedText variant="title" style={{ fontSize: 22, marginBottom: spacing.lg }}>
        Why MailMop
      </ThemedText>
      {landingFeatures.map((feature) => (
        <Card key={feature.title} style={styles.card}>
          <CardContent>
            <ThemedText style={{ fontWeight: '700', marginBottom: spacing.xs }}>{feature.title}</ThemedText>
            <ThemedText variant="muted">{feature.desc}</ThemedText>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.xl },
  card: { marginBottom: spacing.sm },
});
