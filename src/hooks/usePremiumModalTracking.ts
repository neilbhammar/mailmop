'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { toast } from 'sonner'
import { supabase } from '@/supabase/client'
import { createActionLog } from '@/supabase/actions/logAction'
import { assignVariant, getOfferForVariant, type DiscountVariant } from '@/lib/discountExperiment'

/**
 * Hook to track premium modal interactions and run the discount A/B/C experiment.
 *
 * Tracks repeated premium modal opens and, once a threshold is crossed, either
 * offers a discount code or deliberately offers nothing, depending on which arm
 * of the experiment the user landed in.
 *
 * EXPERIMENT (see docs/experiments/2026-08-discount-ab-test.md):
 *   control  -> EARLYBIRD50 toast (what every user got before this change)
 *   none     -> no toast
 *   early25  -> EARLY25 toast
 *
 * Every arm records a `discount_experiment_exposure` action at the moment the
 * threshold is crossed, including the `none` arm. Without that row the no-discount
 * arm would have no denominator and the experiment could not be read.
 *
 * KNOWN, INTENTIONALLY UNCHANGED: `checkDailyReset` below only fires when
 * `lastResetDate` is already set, and that field is only ever written by
 * `resetTracking`, which runs on upgrade. For a user who never upgrades it stays
 * empty, so the daily reset never runs and the toast appears at most once per
 * browser. That is the behaviour that produced the historical data, and it applies
 * identically to all three arms, so it does not bias the experiment. Do not "fix"
 * it while the experiment is running: it would change exposure frequency mid-test.
 */
export function usePremiumModalTracking() {
  const { user, plan } = useAuth()
  const modalCountRef = useRef<number>(0)
  const discountOfferedRef = useRef<boolean>(false)
  const lastResetDateRef = useRef<string>('')

  // Configuration
  const MODAL_THRESHOLD = 2 // Number of modal opens before the experiment fires
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
   * Records the experiment exposure so the results are queryable in SQL.
   *
   * Two writes: a durable `discount_experiment_exposure` action row (the event),
   * and a denormalised `profiles.discount_variant` (the cache, for easy joins).
   * Both are best effort. Assignment is a pure function of user id, so if either
   * write fails the user still sees the same arm and the bucket can be recomputed
   * during analysis.
   */
  const recordExposure = useCallback(async (variant: DiscountVariant, featureName: string) => {
    if (!user?.id) return

    try {
      await createActionLog({
        user_id: user.id,
        type: 'discount_experiment_exposure',
        status: 'completed',
        count: 1,
        notes: `variant=${variant};feature=${featureName}`
      })
    } catch (error) {
      console.error('[PremiumTracking] Failed to log experiment exposure:', error)
    }

    try {
      // Only stamp the first exposure. `is('discount_variant', null)` keeps a
      // later exposure from rewriting an earlier assignment.
      const { error } = await supabase
        .from('profiles')
        .update({
          discount_variant: variant,
          discount_variant_assigned_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .is('discount_variant', null)

      if (error) {
        console.error('[PremiumTracking] Failed to persist variant:', error.message)
      }
    } catch (error) {
      console.error('[PremiumTracking] Failed to persist variant:', error)
    }
  }, [user?.id])

  /**
   * Fire the experiment: assign a variant, record it, and show the matching offer.
   */
  const triggerDiscountOffer = useCallback((featureName: string) => {
    if (discountOfferedRef.current) return
    if (!user?.id) return

    try {
      // Mark as fired to prevent repeats within this browser
      discountOfferedRef.current = true
      saveTrackingData()

      const variant = assignVariant(user.id)
      const offer = getOfferForVariant(variant)

      // Exposure is recorded for every arm, including `none`. Fire and forget.
      void recordExposure(variant, featureName)

      console.log('[PremiumTracking] Discount experiment fired:', {
        featureName,
        modalCount: modalCountRef.current,
        variant,
        offerCode: offer?.code ?? null
      })

      if (!offer) {
        // The `none` arm. Deliberately silent: this is the arm that tests whether
        // the discount was buying conversions or just discounting them.
        return
      }

      toast.info(
        `Hey - I noticed you wanted to try Premium. Here's a ${offer.label} code you can use at checkout: ${offer.code}`,
        {
          duration: Infinity, // Requires manual dismissal
          position: 'bottom-right',
        }
      )
    } catch (error) {
      console.error('[PremiumTracking] Error triggering discount offer:', error)
    }
  }, [user?.id, saveTrackingData, recordExposure])

  /**
   * Track when a premium modal is opened
   */
  const trackPremiumModalOpen = useCallback((featureName: string) => {
    // Don't track if user is already premium
    if (plan === 'pro') return

    // Don't track if the experiment already fired for this user
    if (discountOfferedRef.current) return

    modalCountRef.current += 1
    saveTrackingData()

    console.log('[PremiumTracking] Premium modal opened:', {
      featureName,
      modalCount: modalCountRef.current,
      threshold: MODAL_THRESHOLD
    })

    if (modalCountRef.current >= MODAL_THRESHOLD) {
      triggerDiscountOffer(featureName)
    }
  }, [plan, saveTrackingData, triggerDiscountOffer])

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
      threshold: MODAL_THRESHOLD,
      variant: user?.id ? assignVariant(user.id) : null
    })
  }
}
