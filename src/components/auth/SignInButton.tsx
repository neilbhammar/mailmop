'use client';

import { useRouter } from 'next/navigation'
import { supabase } from '@/supabase/client';
import { isEmbeddedBrowser } from '@/lib/utils/embeddedBrowser';

export const SignInButton = () => {
  const router = useRouter()
  
  const handleLogin = async () => {
    // Check if user is in an embedded browser first
    if (isEmbeddedBrowser()) {
      // Redirect to the "open in browser" page instead of attempting OAuth
      router.push('/open-in-browser')
      return
    }

    // Proceed with normal OAuth flow if not in embedded browser
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectUrl}/dashboard`,
      },
    });
  };

  return (
    <button onClick={handleLogin} className="px-4 py-2 bg-black text-white rounded">
      Sign in with Google
    </button>
  );
};
