// Types for user profiles and related data

export type Profile = {
  user_id: string
  email: string
  name: string | null
  avatar_url: string | null
  plan: string | null
  plan_expires_at: string | null
  plan_updated_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  cancel_at_period_end: boolean | null
  last_login: string | null
  created_at: string
  updated_at: string
}

// Input type for profile updates - making all fields optional
export type ProfileUpdate = Partial<Profile> 