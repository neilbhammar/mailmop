'use client'

import { useEffect, useRef } from 'react'
import { Crisp } from 'crisp-sdk-web'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/supabase/client'

// Get Crisp Website ID from environment variables
const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID

/**
 * CrispProvider component that integrates Crisp chat with user authentication
 * 
 * Features:
 * - Automatically configures Crisp when component mounts
 * - Sets user information (email, name) when user is authenticated
 * - Implements user verification with HMAC-SHA256 signatures for security
 * - Handles user logout by resetting the chat session
 * - Provides session continuity using user ID as token
 */
export function CrispProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, session } = useAuth()
  const crispConfigured = useRef(false)
  const lastUserId = useRef<string | null>(null)

  // Configure Crisp when component mounts
  useEffect(() => {
    if (!crispConfigured.current) {
      // Check if Crisp Website ID is configured
      if (!CRISP_WEBSITE_ID) {
        console.warn('[Crisp] NEXT_PUBLIC_CRISP_WEBSITE_ID environment variable not set. Crisp chat will not be available.')
        return
      }

      try {
        // Configure Crisp with manual loading to control when it appears
        Crisp.configure(CRISP_WEBSITE_ID, {
          autoload: false, // We'll load it manually after setting user info
          locale: 'en', // Set default locale
          safeMode: true // Enable safe mode to prevent errors
        })
        
        crispConfigured.current = true
        console.log('[Crisp] Configured successfully')
      } catch (error) {
        console.error('[Crisp] Configuration error:', error)
      }
    }
  }, [])

  // Handle user authentication changes
  useEffect(() => {
    if (!crispConfigured.current) return

    const handleUserAuth = async () => {
      try {
        // If user logged out, reset the session
        if (!user && lastUserId.current) {
          console.log('[Crisp] User logged out, resetting session')
          Crisp.setTokenId() // Clear token
          Crisp.session.reset() // Reset session
          lastUserId.current = null
          return
        }

        // If user is authenticated and it's a different user than before
        if (user && user.id !== lastUserId.current) {
          console.log('[Crisp] Setting up Crisp for authenticated user:', user.email)
          
          // Set session continuity token using user ID
          Crisp.setTokenId(user.id)
          
          // Set basic user information
          if (user.email) {
            // Get verified email signature from backend
            const signature = await getEmailSignature()
            
            if (signature) {
              // Set email with verification signature
              Crisp.user.setEmail(user.email, signature)
              console.log('[Crisp] Set verified email:', user.email)
            } else {
              // Fallback to unverified email if signature fails
              Crisp.user.setEmail(user.email)
              console.log('[Crisp] Set unverified email:', user.email)
            }
          }

          // Set user nickname from profile
          if (profile?.name) {
            Crisp.user.setNickname(profile.name)
          } else if (user.user_metadata?.name) {
            Crisp.user.setNickname(user.user_metadata.name)
          }

          // Set custom session data for support context
          Crisp.session.setData({
            user_id: user.id,
            plan: profile?.plan || 'free',
            signup_date: user.created_at,
            last_login: profile?.last_login || user.last_sign_in_at
          })

          // Load Crisp after setting user information
          Crisp.load()
          
          lastUserId.current = user.id
        }
      } catch (error) {
        console.error('[Crisp] Error setting up user authentication:', error)
        // Load Crisp anyway, but without verification
        if (user?.email) {
          Crisp.user.setEmail(user.email)
          Crisp.load()
        }
      }
    }

    handleUserAuth()
  }, [user, profile])

  /**
   * Get email signature from backend for user verification
   * This ensures that support can verify the user's identity
   */
  const getEmailSignature = async (): Promise<string | null> => {
    try {
      if (!session?.access_token) {
        console.warn('[Crisp] No access token available for signature')
        return null
      }

      const response = await fetch('/api/crisp/sign-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('[Crisp] Failed to get email signature:', response.status)
        return null
      }

      const data = await response.json()
      return data.signature
    } catch (error) {
      console.error('[Crisp] Error getting email signature:', error)
      return null
    }
  }

  // Handle plan changes for existing users
  useEffect(() => {
    if (user && profile && crispConfigured.current) {
      // Update session data when plan changes
      Crisp.session.setData({
        user_id: user.id,
        plan: profile.plan || 'free',
        signup_date: user.created_at,
        last_login: profile.last_login || user.last_sign_in_at
      })
    }
  }, [user, profile])

  return <>{children}</>
}

/**
 * Hook to access Crisp functionality
 * Use this in components where you need to interact with Crisp programmatically
 */
export function useCrisp() {
  const isCrispAvailable = !!CRISP_WEBSITE_ID

  return {
    openChat: () => {
      if (!isCrispAvailable) {
        console.warn('[Crisp] Cannot open chat - Crisp not configured')
        return
      }
      Crisp.chat.open()
    },
    closeChat: () => {
      if (!isCrispAvailable) return
      Crisp.chat.close()
    },
    showChat: () => {
      if (!isCrispAvailable) return
      Crisp.chat.show()
    },
    hideChat: () => {
      if (!isCrispAvailable) return
      Crisp.chat.hide()
    },
    sendMessage: (message: string) => {
      if (!isCrispAvailable) {
        console.warn('[Crisp] Cannot send message - Crisp not configured')
        return
      }
      Crisp.message.sendText(message)
    },
    pushEvent: (event: string, data?: any) => {
      if (!isCrispAvailable) {
        console.warn('[Crisp] Cannot push event - Crisp not configured')
        return
      }
      Crisp.session.pushEvent(event, data)
    },
    isAvailable: isCrispAvailable
  }
}
