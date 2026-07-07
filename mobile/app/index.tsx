import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase, getSupabaseRedirectUri } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing, radius } from '@/theme/colors';
import { config } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

const FEATURES = [
  { title: 'Analyze by sender', desc: 'See who fills your inbox — grouped and sortable.' },
  { title: 'Bulk delete', desc: 'Remove thousands of emails in a few taps (Pro).' },
  { title: 'One-click unsubscribe', desc: 'Stop newsletters without hunting for links.' },
  { title: 'Privacy-first', desc: 'Analysis runs on your device. Emails stay with you.' },
];

export default function LandingScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(app)/dashboard');
    }
  }, [user, isLoading, router]);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    try {
      const redirectTo = getSupabaseRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.replace('#', '?'));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          }
        }
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

        <Card style={[styles.previewCard, { width: width - spacing.xl * 2 }]}>
          <CardContent>
            <View style={[styles.previewInner, { backgroundColor: isDark ? colors.slate800 : colors.slate100 }]}>
              <ThemedText variant="label" style={{ color: colors.blue }}>
                Dashboard preview
              </ThemedText>
              <ThemedText variant="muted" style={{ marginTop: spacing.sm }}>
                Connect Gmail → Analyze senders → Take action
              </ThemedText>
            </View>
          </CardContent>
        </Card>

        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <Card key={feature.title} style={styles.featureCard}>
              <CardContent>
                <ThemedText style={{ fontWeight: '700', marginBottom: spacing.xs }}>{feature.title}</ThemedText>
                <ThemedText variant="muted">{feature.desc}</ThemedText>
              </CardContent>
            </Card>
          ))}
        </View>

        <View style={styles.pricing}>
          <ThemedText variant="title" style={{ fontSize: 22, marginBottom: spacing.lg }}>
            Simple pricing
          </ThemedText>
          <View style={styles.pricingRow}>
            <Card style={[styles.priceCard, { flex: 1 }]}>
              <CardContent>
                <ThemedText style={{ fontWeight: '700', fontSize: 18 }}>Free</ThemedText>
                <ThemedText variant="muted" style={{ marginVertical: spacing.sm }}>
                  Analyze, unsubscribe, export
                </ThemedText>
                <ThemedText style={{ fontSize: 24, fontWeight: '700' }}>$0</ThemedText>
              </CardContent>
            </Card>
            <Card style={[styles.priceCard, { flex: 1, borderColor: colors.blue }]}>
              <CardContent>
                <ThemedText style={{ fontWeight: '700', fontSize: 18, color: colors.blue }}>Pro</ThemedText>
                <ThemedText variant="muted" style={{ marginVertical: spacing.sm }}>
                  Bulk delete, labels, filters
                </ThemedText>
                <ThemedText style={{ fontSize: 24, fontWeight: '700' }}>$22.68/yr</ThemedText>
              </CardContent>
            </Card>
          </View>
        </View>

        <View style={styles.cta}>
          <Button onPress={signInWithGoogle} loading={signingIn} size="lg" style={styles.ctaButton}>
            Get Started with Google
          </Button>
          <ThemedText variant="muted" style={styles.footerNote}>
            By continuing you agree to our{' '}
            <ThemedText
              style={{ color: colors.blue }}
              onPress={() => Linking.openURL(`${config.apiBaseUrl}/terms`)}
            >
              Terms
            </ThemedText>{' '}
            and{' '}
            <ThemedText
              style={{ color: colors.blue }}
              onPress={() => Linking.openURL(`${config.apiBaseUrl}/privacy`)}
            >
              Privacy Policy
            </ThemedText>
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl * 2 },
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
  previewCard: { alignSelf: 'center', marginTop: spacing.xl },
  previewInner: { borderRadius: radius.md, padding: spacing.lg, minHeight: 120 },
  features: { padding: spacing.xl, gap: spacing.md },
  featureCard: { marginBottom: spacing.sm },
  pricing: { paddingHorizontal: spacing.xl },
  pricingRow: { flexDirection: 'row', gap: spacing.md },
  priceCard: {},
  cta: { padding: spacing.xl, alignItems: 'center' },
  ctaButton: { width: '100%', marginBottom: spacing.lg },
  footerNote: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
});
