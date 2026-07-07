import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? (extra.supabaseUrl as string) ?? '',
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? (extra.supabaseAnonKey as string) ?? '',
  googleClientId:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? (extra.googleClientId as string) ?? '',
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_URL ??
    (extra.apiBaseUrl as string) ??
    'https://mailmop.com',
  appScheme: 'mailmop',
};

export function getGmailRedirectUri(): string {
  return `${config.appScheme}://auth/gmail-callback`;
}

export function getSupabaseRedirectUri(): string {
  return `${config.appScheme}://auth/callback`;
}
