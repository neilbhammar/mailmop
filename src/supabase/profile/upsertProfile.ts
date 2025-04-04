// src/supabase/profile/upsertProfile.ts
import { supabase } from '@/supabase/client'

export const upsertProfile = async (user: {
    id: string
    email: string
    name: string | null
    avatar_url: string | null
  }) => {
    console.log('[upsertProfile] Attempting with:', user)
  
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        last_login: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select() // ✅ THIS LINE IS CRUCIAL
  
    if (error) {
      console.error('[upsertProfile] Supabase error:', error)
    } else {
      console.log('[upsertProfile] SUCCESS:', data)
    }
  
    return { data, error }
  }
  
