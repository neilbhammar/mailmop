import { supabase } from '@/supabase/client'
import type { Profile } from '@/types/user'

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  return { data: data as Profile | null, error }
}
