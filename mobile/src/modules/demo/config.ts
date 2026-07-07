/**
 * When true, the app shows a "Preview with demo data" entry point.
 * No Supabase or Google credentials required.
 */
export function isDemoPreviewEnabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_DEMO_MODE === 'true' ||
    (__DEV__ && process.env.EXPO_PUBLIC_DEMO_MODE !== 'false')
  );
}
