import { useCallback, useState } from 'react'
import { supabase } from '@/supabase/client'
import { isWhitelisted as checkWhitelistStatus } from '@/supabase/whitelist'

export function useWhitelist() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null)

  const checkWhitelist = useCallback(async (email: string) => {
    console.log('[Whitelist] Checking status for user...')
    setIsLoading(true)
    setError(null)
    try {
      const whitelisted = await checkWhitelistStatus(email)
      console.log(`[Whitelist] User ${whitelisted ? 'is' : 'is not'} on whitelist`)
      setIsWhitelisted(whitelisted)
      return whitelisted
    } catch (error) {
      console.error('[Whitelist] Error checking status:', error)
      setError(error as Error)
      setIsWhitelisted(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    checkWhitelist,
    isWhitelisted,
    isLoading,
    error
  }
} 