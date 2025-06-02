'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/supabase/client'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { checkUserMismatch, clearAllUserData } from '@/lib/storage/userStorage'
import type { Profile } from '@/types/user'

type AuthContextType = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
  plan: 'free' | 'pro'
  profile: Profile | null
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  user: null, 
  isLoading: true,
  signOut: async () => {},
  plan: 'free' as const,
  profile: null
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [plan, setPlan] = useState<'free' | 'pro'>('free')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const processingAuth = useRef(false)
  const lastSessionId = useRef<string | null>(null)
  const { updateProfile, fetchProfile } = useUserProfile()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleAuth = useCallback(async (session: Session | null, event?: AuthChangeEvent) => {
    if (session?.user) {
      try {
        // Check for user mismatch and clear data if different user
        if (session.user.email) {
          await checkUserMismatch(session.user.email);
        }
        
        const fetchedProfile = await fetchProfile(session.user.id)
        if (fetchedProfile) {
          setPlan(fetchedProfile.plan === 'pro' ? 'pro' : 'free')
          setProfile(fetchedProfile)
        }
        setUser(session.user)
        setSession(session)
      } catch (error) {
        console.error('[Auth] Error in auth change:', error)
      }
    } else {
      setProfile(null)
      setUser(null)
      setSession(null)
      setPlan('free')
      if (event === 'SIGNED_OUT') {
        router.push('/')
      }
    }
    setIsLoading(false)
  }, [fetchProfile, router])

  // Initial session check
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
      handleAuth(session)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuth(session, event)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [router, updateProfile, fetchProfile, handleAuth])

  // Separate effect for profile changes subscription
  useEffect(() => {
    let mounted = true
    let subscription: ReturnType<typeof supabase.channel> | null = null

    // Only set up subscription if we have a user ID
    if (session?.user?.id) {
      console.log('[Auth] Setting up profile changes subscription for user:', session.user.id)
      subscription = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${session.user.id}`
          },
          async (payload) => {
            console.log('[Auth] Profile change event received:', payload)
            if (mounted) {
              try {
              const fetchedProfile = await fetchProfile(session.user.id)
              if (fetchedProfile) {
                  console.log('[Auth] Updated profile:', fetchedProfile)
                  setPlan(fetchedProfile.plan === 'pro' ? 'pro' : 'free')
                setProfile(fetchedProfile)
                  // Emit a custom event when profile is updated
                  window.dispatchEvent(new CustomEvent('profileUpdated', { detail: fetchedProfile }))
                }
              } catch (error) {
                console.error('[Auth] Error fetching updated profile:', error)
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('[Auth] Subscription status:', status)
        })
    }

    return () => {
      mounted = false
      if (subscription) {
        console.log('[Auth] Cleaning up profile changes subscription')
        subscription.unsubscribe()
      }
    }
  }, [session?.user?.id, fetchProfile])

  const value = {
        session, 
    user,
    profile,
    plan,
        isLoading,
        signOut,
    updateProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
