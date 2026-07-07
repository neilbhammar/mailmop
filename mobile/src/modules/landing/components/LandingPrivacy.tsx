import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/context/ThemeProvider';
import { privacyPoints } from '../content';
import { spacing, radius } from '@/theme/colors';

export function LandingPrivacy() {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.blue }]}>
      <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 22, marginBottom: spacing.sm }}>
        Built for Privacy
      </ThemedText>
      <ThemedText style={{ color: 'rgba(255,255,255,0.85)', marginBottom: spacing.lg, lineHeight: 22 }}>
        Your emails never leave your device. MailMop passed Google's CASA security audit.
      </ThemedText>
      {privacyPoints.map((point) => (
        <View key={point.title} style={styles.point}>
          <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{point.title}</ThemedText>
          <ThemedText style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 14 }}>
            {point.desc}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
  },
  point: { marginBottom: spacing.md },
});
