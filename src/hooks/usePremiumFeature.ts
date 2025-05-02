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
  mark_read: 'view', // Map to closest existing action type
  unsubscribe: 'unsubscribe',
  apply_label: 'view', // Map to closest existing action type
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
   * Log attempted usage of premium features for analytics
   * @param feature The premium feature being used
   * @param count Number of items being processed
   * @param success Whether the access was successful
   */
  const logFeatureAttempt = useCallback(async (
    feature: PremiumFeature, 
    count: number = 1,
    success: boolean = false
  ) => {
    if (!user?.id) return
    
    try {
      // Map the feature to the actual action type for logging
      const actionType = featureToActionType[feature]
      // Use valid ActionStatus values
      const status: ActionStatus = success ? 'completed' : 'started'
      
      await createActionLog({
        user_id: user.id,
        type: actionType,
        status: status,
        count
      })
    } catch (error) {
      console.error(`Failed to log ${feature} attempt:`, error)
      // Don't show error to user since this is non-critical
    }
  }, [user?.id])
  
  /**
   * Check if a feature is available, and show premium modal if not
   * @param feature The premium feature to check
   * @param count Number of items being processed
   * @returns Boolean indicating if the feature is available
   */
  const checkFeatureAccess = useCallback((
    feature: PremiumFeature,
    count: number = 1
  ): boolean => {
    // Log the attempt for analytics
    logFeatureAttempt(feature, count, isPremium)
    
    // If the user has premium access, allow the feature
    if (isPremium) {
      return true
    }
    
    // Otherwise store the feature information and show the modal
    setCurrentFeature(feature)
    setItemCount(count)
    setIsPremiumModalOpen(true)
    
    return false
  }, [isPremium, logFeatureAttempt])
  
  return {
    isPremium,
    checkFeatureAccess,
    logFeatureAttempt,
    
    // Modal state for the component
    isPremiumModalOpen,
    setIsPremiumModalOpen,
    currentFeature,
    itemCount
  }
} 