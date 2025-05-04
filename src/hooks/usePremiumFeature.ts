/**
 * Hook to check if a premium feature is available for the current user
 * 
 * This hook:
 * 1. Checks the user's current plan from AuthProvider
 * 2. Returns state indicating if the feature is available
 * 3. Provides functions to track attempted usage for analytics
 *
 * @returns Object with isPremium flag and usage tracking functions
 */

import { useCallback, useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { createActionLog } from '@/supabase/actions/logAction'
import { ActionType, ActionStatus } from '@/types/actions'

// Map of premium features to their ActionType for logging
const featureToActionType: Record<string, ActionType> = {
  delete: 'delete',
  mark_read: 'apply_label', // Map to closest existing action type
  unsubscribe: 'unsubscribe',
  apply_label: 'apply_label', // Map to closest existing action type
  delete_with_exceptions: 'delete',
  block_sender: 'block'
}

// Premium features in the app
export type PremiumFeature = keyof typeof featureToActionType

/**
 * Hook to check if a user has access to premium features
 * and handle the premium feature modal flow
 */
export function usePremiumFeature() {
  const { user, plan } = useAuth()
  
  // State for premium feature modal
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false)
  const [currentFeature, setCurrentFeature] = useState<PremiumFeature | null>(null)
  const [itemCount, setItemCount] = useState(0)
  
  // Determine if user has premium access
  const isPremium = plan === 'pro'
  
  /**
   * Log an *attempt* to use a premium feature when access is denied.
   * @param feature The premium feature being attempted
   * @param count Number of items involved in the attempted action
   */
  const logFailedPremiumAttempt = useCallback(async (
    feature: PremiumFeature, 
    count: number = 1
  ) => {
    // Only log if we have a user ID
    if (!user?.id) return
    
    try {
      // Log specifically as a 'premium_attempt'
      const actionType: ActionType = 'premium_attempt';
      // Status represents the completed *attempt*, not feature success
      const status: ActionStatus = 'completed'; 
      
      await createActionLog({
        user_id: user.id,
        type: actionType,
        status: status,
        count: count, // Log how many items were involved
        notes: `${feature}` // Store attempted feature in notes
      })
    } catch (error) {
      // Log error to console, but don't interrupt user flow
      console.error(`Failed to log premium feature attempt (${feature}):`, error)
    }
  }, [user?.id])
  
  /**
   * Check if a feature is available. If not, log the failed attempt and show the premium modal.
   * @param feature The premium feature to check
   * @param count Number of items being processed
   * @returns Boolean indicating if the feature is available (user has premium access)
   */
  const checkFeatureAccess = useCallback((
    feature: PremiumFeature,
    count: number = 1
  ): boolean => {
    // If the user has premium access, allow the feature immediately
    if (isPremium) {
      return true
    }
    
    // --- User does NOT have premium access --- 
    
    // 1. Log the failed attempt
    logFailedPremiumAttempt(feature, count)
    
    // 2. Store the feature information for the modal
    setCurrentFeature(feature)
    setItemCount(count)
    
    // 3. Trigger the modal to open
    setIsPremiumModalOpen(true)
    
    // 4. Return false indicating access is denied
    return false
  }, [isPremium, logFailedPremiumAttempt])
  
  return {
    isPremium,
    checkFeatureAccess,
    // Note: logFailedPremiumAttempt is internal, not exposed directly
    
    // Modal state and setters for the component using the hook
    isPremiumModalOpen,
    setIsPremiumModalOpen,
    currentFeature,
    itemCount
  }
} 