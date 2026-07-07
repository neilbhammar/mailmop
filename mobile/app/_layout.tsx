import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { ThemeProvider, useTheme } from '@/context/ThemeProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { GmailPermissionsProvider } from '@/context/GmailPermissionsProvider';
import { AnalysisProvider } from '@/context/AnalysisProvider';
import { View, ActivityIndicator } from 'react-native';

function RootNavigator() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <GmailPermissionsProvider>
          <AnalysisProvider>{children}</AnalysisProvider>
        </GmailPermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          <RootNavigator />
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
