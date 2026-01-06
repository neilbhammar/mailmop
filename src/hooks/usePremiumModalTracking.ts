'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { toast } from 'sonner'

/**
 * Hook to track premium modal interactions and trigger discount offers
 *
 * This tracks when users repeatedly open premium modals without upgrading
 * and shows a persistent toast with a discount offer after a threshold is reached
 */
export function usePremiumModalTracking() {
  const { user, plan } = useAuth()
  const modalCountRef = useRef<number>(0)
  const discountOfferedRef = useRef<boolean>(false)
  const lastResetDateRef = useRef<string>('')
  
  // Configuration
  const MODAL_THRESHOLD = 2 // Number of modal opens before offering discount
  const STORAGE_KEY = 'mailmop_premium_modal_tracking'
  
  /**
   * Load tracking data from localStorage
   */
  const loadTrackingData = useCallback(() => {
    if (typeof window === 'undefined' || !user?.id) return
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`)
      if (stored) {
        const data = JSON.parse(stored)
        modalCountRef.current = data.modalCount || 0
        discountOfferedRef.current = data.discountOffered || false
        lastResetDateRef.current = data.lastResetDate || ''
        
        console.log('[PremiumTracking] Loaded tracking data:', {
          modalCount: modalCountRef.current,
          discountOffered: discountOfferedRef.current,
          lastResetDate: lastResetDateRef.current
        })
      }
    } catch (error) {
      console.error('[PremiumTracking] Error loading tracking data:', error)
    }
  }, [user?.id])
  
  /**
   * Save tracking data to localStorage
   */
  const saveTrackingData = useCallback(() => {
    if (typeof window === 'undefined' || !user?.id) return
    
    try {
      const data = {
        modalCount: modalCountRef.current,
        discountOffered: discountOfferedRef.current,
        lastResetDate: lastResetDateRef.current,
        updatedAt: new Date().toISOString()
      }
      
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(data))
      console.log('[PremiumTracking] Saved tracking data:', data)
    } catch (error) {
      console.error('[PremiumTracking] Error saving tracking data:', error)
    }
  }, [user?.id])
  
  /**
   * Reset tracking data (called when user upgrades or daily reset)
   */
  const resetTracking = useCallback(() => {
    modalCountRef.current = 0
    discountOfferedRef.current = false
    lastResetDateRef.current = new Date().toDateString()
    saveTrackingData()
    
    console.log('[PremiumTracking] Reset tracking data')
  }, [saveTrackingData])
  
  /**
   * Check if we should reset daily (to prevent spam)
   */
  const checkDailyReset = useCallback(() => {
    const today = new Date().toDateString()
    if (lastResetDateRef.current && lastResetDateRef.current !== today) {
      // Reset discount offered flag daily, but keep modal count
      discountOfferedRef.current = false
      lastResetDateRef.current = today
      saveTrackingData()
      
      console.log('[PremiumTracking] Daily reset - discount offer flag cleared')
    }
  }, [saveTrackingData])
  
  /**
   * Track when a premium modal is opened
   */
  const trackPremiumModalOpen = useCallback((featureName: string) => {
    // Don't track if user is already premium
    if (plan === 'pro') return
    
    // Don't track if we already offered discount today
    if (discountOfferedRef.current) return
    
    modalCountRef.current += 1
    saveTrackingData()
    
    console.log('[PremiumTracking] Premium modal opened:', {
      featureName,
      modalCount: modalCountRef.current,
      threshold: MODAL_THRESHOLD
    })
    
    // Check if we should trigger discount offer
    if (modalCountRef.current >= MODAL_THRESHOLD) {
      triggerDiscountOffer(featureName)
    }
  }, [plan, saveTrackingData])
  
  /**
   * Trigger discount offer via persistent toast
   */
  const triggerDiscountOffer = useCallback((featureName: string) => {
    if (discountOfferedRef.current) return

    try {
      // Mark discount as offered to prevent spam
      discountOfferedRef.current = true
      saveTrackingData()

      // Show persistent toast with discount code
      toast.info(
        "Hey - I noticed you wanted to try Premium. Here's a 50% discount code you can use at checkout: EARLYBIRD50",
        {
          duration: Infinity, // Requires manual dismissal
          position: 'bottom-right',
        }
      )

      console.log('[PremiumTracking] Triggered discount offer toast:', {
        featureName,
        modalCount: modalCountRef.current
      })

    } catch (error) {
      console.error('[PremiumTracking] Error triggering discount offer:', error)
    }
  }, [saveTrackingData])
  
  /**
   * Track when user closes modal without upgrading
   */
  const trackPremiumModalClose = useCallback((featureName: string, upgraded: boolean = false) => {
    if (upgraded) {
      // User upgraded - reset all tracking
      resetTracking()
      console.log('[PremiumTracking] User upgraded - tracking reset')
    } else {
      console.log('[PremiumTracking] Premium modal closed without upgrade:', featureName)
    }
  }, [resetTracking])
  
  // Load tracking data when user changes
  useEffect(() => {
    loadTrackingData()
    checkDailyReset()
  }, [user?.id, loadTrackingData, checkDailyReset])
  
  // Reset tracking when user upgrades to pro
  useEffect(() => {
    if (plan === 'pro') {
      resetTracking()
    }
  }, [plan, resetTracking])
  
  return {
    trackPremiumModalOpen,
    trackPremiumModalClose,
    resetTracking,
    // Expose current state for debugging
    getCurrentState: () => ({
      modalCount: modalCountRef.current,
      discountOffered: discountOfferedRef.current,
      threshold: MODAL_THRESHOLD
    })
  }
}
