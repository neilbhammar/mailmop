import { useDemoSession, mockSenders, mockGmailStats, mockUser } from '@/modules/demo';

/** Dashboard data source — swaps to mock data when demo session is active. */
export function useDashboardPreview() {
  const { isActive, exitDemo } = useDemoSession();

  return {
    isDemo: isActive,
    exitDemo,
    user: isActive ? mockUser : null,
    plan: isActive ? ('pro' as const) : null,
    senders: isActive ? mockSenders : null,
    gmailStats: isActive ? mockGmailStats : null,
    hasAnalysis: isActive,
    hasGmailConnected: isActive,
  };
}
