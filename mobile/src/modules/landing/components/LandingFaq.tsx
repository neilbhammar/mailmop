import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/context/ThemeProvider';
import { landingFaqs } from '../content';
import { spacing } from '@/theme/colors';

export function LandingFaq() {
  const { colors } = useTheme();
  const [openId, setOpenId] = useState<string | null>('why-exist');

  return (
    <View style={styles.section}>
      <ThemedText variant="title" style={{ fontSize: 22, marginBottom: spacing.sm }}>
        FAQ
      </ThemedText>
      <ThemedText variant="muted" style={{ marginBottom: spacing.lg }}>
        Everything you need to know about MailMop
      </ThemedText>
      {landingFaqs.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <Card key={faq.id} style={styles.card}>
            <TouchableOpacity onPress={() => setOpenId(isOpen ? null : faq.id)}>
              <CardContent>
                <ThemedText style={{ fontWeight: '600' }}>{faq.question}</ThemedText>
                {isOpen && (
                  <ThemedText variant="muted" style={{ marginTop: spacing.sm, lineHeight: 22 }}>
                    {faq.answer}
                  </ThemedText>
                )}
              </CardContent>
            </TouchableOpacity>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  card: { marginBottom: spacing.sm },
});
