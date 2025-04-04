import { useCallback, useState } from 'react'
import { supabase } from '@/supabase/client'

export function useWhitelist() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null)

  const checkWhitelist = useCallback(async (email: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Query the whitelist_emails table
      const { data, error } = await supabase
        .from('whitelist_emails')
        .select('email')
        .eq('email', email.toLowerCase())

      if (error) throw error
      
      // If we found any rows, the email is whitelisted
      const isAllowed = Array.isArray(data) && data.length > 0
      setIsWhitelisted(isAllowed)
      return isAllowed
    } catch (e) {
      const error = e as Error
      console.error('[useWhitelist] Error:', error)
      setError(error)
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