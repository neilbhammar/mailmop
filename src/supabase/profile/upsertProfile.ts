// src/supabase/profile/upsertProfile.ts
import { supabase } from '@/supabase/client'
import type { Profile, ProfileUpdate } from '@/types/user'

export const upsertProfile = async (profile: ProfileUpdate) => {
  console.log('[upsertProfile] Attempting with:', profile)

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      ...profile,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select()

  if (error) {
    console.error('[upsertProfile] Supabase error:', error)
  } else {
    console.log('[upsertProfile] SUCCESS:', data)
  }

  return { data: data as Profile | null, error }
}
  
