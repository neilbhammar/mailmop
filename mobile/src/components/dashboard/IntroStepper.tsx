import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useGmailStats } from '@/hooks/useGmailStats';
import { useTheme } from '@/context/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing, radius } from '@/theme/colors';
import { estimateRuntimeMs, formatDuration } from '@/lib/utils/estimateRuntime';

interface IntroStepperProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export function IntroStepper({ onComplete, onCancel }: IntroStepperProps) {
  const { colors } = useTheme();
  const { hasRefreshToken, requestPermissions, isLoading } = useGmailPermissions();
  const { stats, refreshStats } = useGmailStats();
  const [step, setStep] = useState(hasRefreshToken ? 2 : 1);
  const [analysisType, setAnalysisType] = useState<'full' | 'quick'>('full');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setStep(hasRefreshToken ? 2 : 1);
    if (hasRefreshToken) refreshStats();
  }, [hasRefreshToken, refreshStats]);

  const eta = formatDuration(
    estimateRuntimeMs({
      operationType: 'analysis',
      emailCount: stats?.totalEmails ?? 10000,
      mode: analysisType,
    })
  );

  const connectGmail = async () => {
    const ok = await requestPermissions();
    if (ok) {
      await refreshStats();
      setStep(2);
    }
  };

  const runAnalysis = async () => {
    setRunning(true);
    // Analysis hook integration point — queue system wires in next iteration
    setTimeout(() => {
      setRunning(false);
      onComplete();
    }, 1500);
  };

  return (
    <Card style={styles.card}>
      <CardContent>
        <View style={styles.stepIndicator}>
          {[1, 2].map((n) => (
            <View key={n} style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: step >= n ? colors.blue : colors.border,
                  },
                ]}
              >
                <ThemedText style={{ color: step >= n ? '#fff' : colors.mutedForeground, fontWeight: '700' }}>
                  {n}
                </ThemedText>
              </View>
              {n === 1 && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: step >= 2 ? colors.blue : colors.border },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {step === 1 ? (
          <View style={styles.stepContent}>
            <ThemedText style={{ fontWeight: '700', fontSize: 18, marginBottom: spacing.sm }}>
              Connect your Gmail
            </ThemedText>
            <ThemedText variant="muted" style={{ marginBottom: spacing.lg }}>
              MailMop needs permission to read email metadata and take actions on your behalf. Your emails stay on your device.
            </ThemedText>
            <Button onPress={connectGmail} loading={isLoading}>
              Connect Gmail
            </Button>
          </View>
        ) : (
          <View style={styles.stepContent}>
            <ThemedText style={{ fontWeight: '700', fontSize: 18, marginBottom: spacing.sm }}>
              Run inbox analysis
            </ThemedText>
            <ThemedText variant="muted" style={{ marginBottom: spacing.lg }}>
              {stats
                ? `${stats.totalEmails.toLocaleString()} emails · ~${eta} estimated`
                : 'Fetching inbox stats...'}
            </ThemedText>

            <View style={styles.modeRow}>
              {(['full', 'quick'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={analysisType === mode ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setAnalysisType(mode)}
                  style={{ flex: 1, marginHorizontal: spacing.xs }}
                >
                  {mode === 'full' ? 'Full scan' : 'Quick scan (25%)'}
                </Button>
              ))}
            </View>

            <Button onPress={runAnalysis} loading={running} style={{ marginTop: spacing.lg }}>
              Start Analysis
            </Button>
          </View>
        )}

        {onCancel && (
          <Button variant="ghost" onPress={onCancel} style={{ marginTop: spacing.md }}>
            Back to results
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 48, height: 2, marginHorizontal: spacing.sm },
  stepContent: { alignItems: 'stretch' },
  modeRow: { flexDirection: 'row' },
});
