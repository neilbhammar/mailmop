import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing, radius } from '@/theme/colors';

interface EmailMismatchModalProps {
  visible: boolean;
  gmailEmail: string | null;
  userEmail: string;
  onClose: () => void;
}

export function EmailMismatchModal({
  visible,
  gmailEmail,
  userEmail,
  onClose,
}: EmailMismatchModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
          <CardContent>
            <ThemedText style={{ fontWeight: '700', fontSize: 18, marginBottom: spacing.sm }}>
              Email mismatch
            </ThemedText>
            <ThemedText variant="muted" style={{ marginBottom: spacing.lg }}>
              The Gmail account you connected ({gmailEmail}) doesn't match your MailMop login ({userEmail}). Please connect the same Google account you signed in with.
            </ThemedText>
            <Button onPress={onClose}>Got it</Button>
          </CardContent>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: { borderRadius: radius.xl },
});
