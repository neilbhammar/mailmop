'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAcquisition } from '@/lib/growth/acquisition';

export function AcquisitionCapture() {
  const pathname = usePathname();
  useEffect(() => {
    try { captureAcquisition(window.sessionStorage, new URL(window.location.href), document.referrer); }
    catch { /* Analytics must never prevent inbox use. */ }
  }, [pathname]);
  return null;
}
