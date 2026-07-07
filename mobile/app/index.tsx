import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { supabase, getSupabaseRedirectUri } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing } from '@/theme/colors';
import { config } from '@/lib/config';
import { isDemoPreviewEnabled, useDemoSession } from '@/modules/demo';
import {
  LandingHero,
  LandingStats,
  LandingHowItWorks,
  LandingFeatures,
  LandingPrivacy,
  LandingFaq,
  LandingPricing,
} from '@/modules/landing/components';

WebBrowser.maybeCompleteAuthSession();

export default function LandingScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();
  const { enterDemo } = useDemoSession();
  const [signingIn, setSigningIn] = useState(false);
  const showDemoButton = isDemoPreviewEnabled();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(app)/dashboard');
    }
  }, [user, isLoading, router]);

  const previewWithDemo = () => {
    enterDemo();
    router.push('/(app)/dashboard');
  };

  const signInWithGoogle = async () => {
    setSigningIn(true);
    try {
      const redirectTo = getSupabaseRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
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
        <LandingHero />
        <LandingStats />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingPrivacy />
        <LandingFaq />
        <LandingPricing />

        <SafeAreaView edges={['bottom']} style={styles.cta}>
          {showDemoButton && (
            <Button onPress={previewWithDemo} size="lg" style={styles.ctaButton}>
              Preview with demo data
            </Button>
          )}
          <Button
            onPress={signInWithGoogle}
            loading={signingIn}
            size="lg"
            variant={showDemoButton ? 'outline' : 'default'}
            style={styles.ctaButton}
          >
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
        </SafeAreaView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  cta: { padding: spacing.xl, alignItems: 'center' },
  ctaButton: { width: '100%', marginBottom: spacing.md },
  footerNote: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
});
