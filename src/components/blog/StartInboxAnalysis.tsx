'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import { isEmbeddedBrowser } from '@/lib/utils/embeddedBrowser';
import { captureAcquisition } from '@/lib/growth/acquisition';

/** Use the same Google sign-in destination as the homepage, without an extra detour. */
export function StartInboxAnalysis({ label = 'Analyze my Gmail free' }: { label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      try { captureAcquisition(window.sessionStorage, new URL(window.location.href), document.referrer); } catch { /* optional */ }
      if (isEmbeddedBrowser()) { router.push('/open-in-browser'); return; }
      const { data } = await supabase.auth.getSession();
      if (data.session) { router.push('/dashboard'); return; }
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (result.error) throw result.error;
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return <div>
    <button type="button" onClick={start} disabled={busy}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-70">
      {busy ? 'Opening your inbox setup…' : label}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">Google sign-in did not open. Please try again.</p>}
  </div>;
}
