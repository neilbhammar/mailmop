import { useCallback, useState } from 'react'
import { getProfile } from '@/supabase/profile/getProfile'
import { upsertProfile } from '@/supabase/profile/upsertProfile'
import type { Profile, ProfileUpdate } from '@/types/user'

export function useUserProfile() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateProfile = useCallback(async (profile: ProfileUpdate) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await upsertProfile(profile)
      if (error) throw error
      return data
    } catch (e) {
      const error = e as Error
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await getProfile(userId)
      if (error) throw error
      return data
    } catch (e) {
      const error = e as Error
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    updateProfile,
    fetchProfile,
    isLoading,
    error
  }
}
