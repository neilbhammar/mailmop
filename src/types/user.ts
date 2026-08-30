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
  /** Discount A/B/C experiment bucket. See src/lib/discountExperiment.ts */
  discount_variant?: 'control' | 'none' | 'early25' | null
  discount_variant_assigned_at?: string | null
  /** Free-delete experiment. Non-null used_at means the one freebie is spent. */
  free_delete_used_at?: string | null
  free_delete_sender?: string | null
  free_delete_count?: number | null
  free_delete_variant?: 'control' | 'free_delete' | null
  last_login: string | null
  created_at: string
  updated_at: string
}

// Input type for profile updates - making all fields optional
export type ProfileUpdate = Partial<Profile> 