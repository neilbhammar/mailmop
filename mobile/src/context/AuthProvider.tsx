import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { checkUserMismatch, clearAllUserData } from '@/lib/storage/userStorage';
import type { Profile } from '@/types/user';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  plan: 'free' | 'pro';
  profile: Profile | null;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
  plan: 'free',
  profile: null,
});

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  if (error) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [isLoading, setIsLoading] = useState(true);
  const processingAuth = useRef(false);

  const signOut = async () => {
    await clearAllUserData();
    await supabase.auth.signOut();
  };

  const handleAuth = useCallback(async (nextSession: Session | null, event?: AuthChangeEvent) => {
    if (processingAuth.current) return;
    processingAuth.current = true;

    try {
      if (nextSession?.user) {
        if (nextSession.user.email) {
          await checkUserMismatch(nextSession.user.email);
        }
        const fetchedProfile = await fetchProfile(nextSession.user.id);
        if (fetchedProfile) {
          setPlan(fetchedProfile.plan === 'pro' ? 'pro' : 'free');
          setProfile(fetchedProfile);
        }
        setUser(nextSession.user);
        setSession(nextSession);
      } else {
        setProfile(null);
        setUser(null);
        setSession(null);
        setPlan('free');
      }
      setIsLoading(false);
    } finally {
      processingAuth.current = false;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => handleAuth(s));

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      handleAuth(s, event);
    });

    return () => listener.subscription.unsubscribe();
  }, [handleAuth]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
      .channel('profile-changes-mobile')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${session.user.id}`,
        },
        async () => {
          const fetchedProfile = await fetchProfile(session.user.id);
          if (fetchedProfile) {
            setPlan(fetchedProfile.plan === 'pro' ? 'pro' : 'free');
            setProfile(fetchedProfile);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider value={{ session, user, profile, plan, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
