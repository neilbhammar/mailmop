import React from 'react';
import { useDemoSession, PreviewDashboardScreen } from '@/modules/demo';
import { LiveDashboardScreen } from '@/screens/LiveDashboardScreen';

/** Routes to demo preview or live dashboard — keeps concerns separate. */
export default function DashboardScreen() {
  const { isActive: isDemo } = useDemoSession();
  return isDemo ? <PreviewDashboardScreen /> : <LiveDashboardScreen />;
}
