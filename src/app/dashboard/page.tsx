'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import Overview from '@/components/dashboard/Overview'
import InboxAnalysisContainer from '@/components/dashboard/InboxAnalysisContainer'
import Footer from '@/components/dashboard/Footer'
import Confetti from 'react-confetti'
import { useWindowSize } from '@react-hook/window-size'
import { ManageSubscriptionModal } from '@/components/modals/ManageSubscriptionModal'
import { RenewalModal } from '@/components/modals/RenewalModal'
import { useActionStats } from '@/hooks/useActionStats'

export default function Dashboard() {
  const router = useRouter()
  const { user, plan } = useAuth()
  const { redirectToCheckout } = useStripeCheckout()
  const [showManageSubscriptionModal, setShowManageSubscriptionModal] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowWidth, windowHeight] = useWindowSize()

  const { stats: actionStats, isLoading: isLoadingActionStats } = useActionStats(user?.id)

  // Handle auto-upgrade from landing page OAuth flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shouldAutoUpgrade = urlParams.get('upgrade') === 'auto'
    
    console.log('[Dashboard] Checking auto-upgrade params:', {
      upgrade: urlParams.get('upgrade'),
      shouldAutoUpgrade,
      hasUser: !!user,
      userPlan: plan,
      allParams: Array.from(urlParams.entries())
    })
    
    if (shouldAutoUpgrade && user) {
      console.log('[Dashboard] Auto-upgrade triggered after OAuth')
      console.log('[Dashboard] User plan:', plan)
      
      // Clean up URL first
      const url = new URL(window.location.href)
      url.searchParams.delete('upgrade')
      window.history.replaceState({}, '', url.toString())
      
      // Check if user is already pro (existing pro account)
      if (plan === 'pro') {
        console.log('[Dashboard] User already has Pro, staying on dashboard')
        // Maybe show a welcome message for existing pro users
        return
      }
      
      // User is either new or existing free user - proceed to checkout
      console.log('[Dashboard] User needs upgrade, triggering checkout')
      
      // Small delay to ensure auth state is fully loaded
      setTimeout(async () => {
        try {
          await redirectToCheckout(() => {
            console.log('[Dashboard] Auto-upgrade checkout successful')
            setShowManageSubscriptionModal(true)
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 5000)
          })
        } catch (error) {
          console.error('[Dashboard] Auto-upgrade checkout failed:', error)
          // Show fallback upgrade option
          setShowManageSubscriptionModal(true)
        }
      }, 1000)
    }
  }, [user, plan, redirectToCheckout])

  // Handle confetti from URL params (for successful checkout)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      setShowConfetti(true)
      setShowManageSubscriptionModal(true)
      
      // Clean up URL without page reload
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
      
      // Stop confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [])

  // Handle renewal modal from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('renewal') === 'true') {
      setShowRenewalModal(true)
      
      // Clean up URL without page reload
      const url = new URL(window.location.href)
      url.searchParams.delete('renewal')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const handleRenewalModalClose = () => {
    setShowRenewalModal(false)
  }

  return (
    <div className="bg-white dark:bg-slate-900">
      {showConfetti && (
        <Confetti
          width={windowWidth}
          height={windowHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      

      
      <Overview />
      <InboxAnalysisContainer />
      
      <Footer />
      
      {showManageSubscriptionModal && (
        <ManageSubscriptionModal
          open={showManageSubscriptionModal}
          onOpenChange={setShowManageSubscriptionModal}
          showConfettiOnMount={showConfetti}
        />
      )}
      <RenewalModal
        open={showRenewalModal}
        onClose={handleRenewalModalClose}
      />
    </div>
  )
}
