'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/supabase/client'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'

type AuthContextType = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  user: null, 
  isLoading: true,
  signOut: async () => {} 
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const processingAuth = useRef(false)
  const lastSessionId = useRef<string | null>(null)
  const { updateProfile } = useUserProfile()

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
            setIsLoading(false)
          }
          return
        }

        console.log(`[Auth] Processing ${event || 'Initial'} auth`)
        if (mounted) setSession(session)

        // Only update profile if this is a new session
        if (sessionId !== lastSessionId.current) {
          try {
            await updateProfile({
              user_id: session.user.id,
              email: session.user.email ?? '',
              name: session.user.user_metadata.full_name ?? '',
              avatar_url: session.user.user_metadata.avatar_url ?? '',
              last_login: new Date().toISOString()
            })
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

    // Initial session check
    supabase.auth.getSession().then(({ data: { session }}) => {
      handleAuth(session)
    })

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuth(session, event)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [router, updateProfile])

  return (
    <AuthContext.Provider value={{ 
      session, 
      user: session?.user ?? null, 
      isLoading,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
