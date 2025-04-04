'use client';

import { supabase } from '@/supabase/client';

export const SignInButton = () => {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/dashboard`,
      },
    });
  };

  return (
    <button onClick={handleLogin} className="px-4 py-2 bg-black text-white rounded">
      Sign in with Google
    </button>
  );
};
