// Types for user profiles and related data

export type Profile = {
  user_id: string
  email: string
  name: string | null
  avatar_url: string | null
  last_login?: string
  updated_at?: string
  plan?: string
  plan_updated_at?: string
}

// Input type for profile updates - making all fields optional
export type ProfileUpdate = Partial<Profile> 