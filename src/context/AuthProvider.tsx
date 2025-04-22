'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/supabase/client'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { checkUserMismatch, clearAllUserData } from '@/lib/storage/userStorage'

type AuthContextType = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
  plan: string | null
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  user: null, 
  isLoading: true,
  signOut: async () => {},
  plan: null
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [plan, setPlan] = useState<string | null>(null)
  const router = useRouter()
  const processingAuth = useRef(false)
  const lastSessionId = useRef<string | null>(null)
  const { updateProfile, fetchProfile } = useUserProfile()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  useEffect(() => {
    let mounted = true

    const handleAuth = async (session: Session | null, event?: string) => {
      // Prevent concurrent auth processing
      if (processingAuth.current) return
      
      // Skip if we've already processed this session
      const sessionId = session?.user?.id
      if (sessionId && sessionId === lastSessionId.current) return
      
      processingAuth.current = true

      try {
        if (!session?.user) {
          if (mounted) {
            setSession(null)
            setPlan(null)
            setIsLoading(false)
          }
          return
        }

        console.log(`[Auth] Processing ${event || 'Initial'} auth`)

        // Check for user mismatch on SIGNED_IN event
        if (event === 'SIGNED_IN' && session.user.email) {
          console.log('[Auth] Checking for user mismatch...')
          const isMismatch = await checkUserMismatch(session.user.email)
          
          if (isMismatch) {
            console.log('[Auth] User mismatch detected, clearing previous data')
            await clearAllUserData()
          } else {
            console.log('[Auth] No user mismatch detected, preserving data')
          }
        }

        if (mounted) setSession(session)

        // Only update profile if this is a new session
        if (sessionId !== lastSessionId.current) {
          try {
            // Update profile in Supabase
            await updateProfile({
              user_id: session.user.id,
              email: session.user.email ?? '',
              name: session.user.user_metadata.full_name ?? '',
              avatar_url: session.user.user_metadata.avatar_url ?? '',
              last_login: new Date().toISOString()
            })

            // Fetch full profile to get plan
            const profile = await fetchProfile(session.user.id)
            if (mounted && profile) {
              setPlan(profile.plan ?? 'free')
            }

            console.log('[Auth] Profile update complete')
            
            if (event === 'SIGNED_IN') {
              router.refresh()
            }

            lastSessionId.current = sessionId ?? null
          } catch (error) {
            console.error('[Auth] Profile update error:', error)
          }
        }
      } catch (error) {
        console.error('[Auth] Error:', error)
      } finally {
        if (mounted) setIsLoading(false)
        processingAuth.current = false
      }
    }

    // Initial session check and auth listener setup
    supabase.auth.getSession().then(({ data: { session }}) => {
      handleAuth(session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuth(session, event)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [router, updateProfile, fetchProfile])

  // Separate effect for profile changes subscription
  useEffect(() => {
    let mounted = true
    let subscription: ReturnType<typeof supabase.channel> | null = null

    // Only set up subscription if we have a user ID
    if (session?.user?.id) {
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
            console.log('[Auth] Profile changed:', payload)
            if (mounted) {
              const profile = await fetchProfile(session.user.id)
              if (profile) {
                setPlan(profile.plan ?? 'free')
              }
            }
          }
        )
        .subscribe()
    }

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [session?.user?.id, fetchProfile])

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AuthContext.Provider value={{ 
        session, 
        user: session?.user ?? null, 
        isLoading,
        signOut,
        plan 
      }}>
        {children}
      </AuthContext.Provider>
    </SessionContextProvider>
  )
}

export const useAuth = () => useContext(AuthContext)
