'use client'

import { useAuth } from '@/context/AuthProvider'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Overview from '@/components/dashboard/Overview'
import InboxAnalysisContainer from '@/components/dashboard/InboxAnalysisContainer'
import Footer from '@/components/dashboard/Footer'
import Confetti from 'react-confetti'
import { useWindowSize } from '@react-hook/window-size'
import { ManageSubscriptionModal } from '@/components/modals/ManageSubscriptionModal'
import { RenewalModal } from '@/components/modals/RenewalModal'

export default function Dashboard() {
  const { user, session, plan } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showConfetti, setShowConfetti] = useState(false)
  const [showManageSubscriptionModal, setShowManageSubscriptionModal] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [windowWidth, windowHeight] = useWindowSize()

  // Effect for handling checkout success
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      console.log('[Dashboard] Checkout success detected (direct access), showing modal and confetti');
      
      // This handles direct access to dashboard?checkout=success (fallback case)
      setShowConfetti(true);
      setShowManageSubscriptionModal(true);
      
      // Stop confetti after 5 seconds
      setTimeout(() => {
        console.log('[Dashboard] Stopping confetti');
        setShowConfetti(false);
      }, 5000);
      
      // Clean up the URL after a short delay to ensure everything loads
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('checkout');
        window.history.replaceState({}, '', url);
      }, 1000);
    }
  }, [searchParams]);

  // Effect for handling renewal parameter
  useEffect(() => {
    const renewParam = searchParams.get('renew');
    console.log('[Dashboard] Checking renewal parameter:', renewParam);
    console.log('[Dashboard] All search params:', Object.fromEntries(searchParams.entries()));
    console.log('[Dashboard] Current showRenewalModal state:', showRenewalModal);
    
    if (renewParam === 'true') {
      console.log('[Dashboard] Renewal parameter detected, showing renewal modal');
      setShowRenewalModal(true);
      console.log('[Dashboard] setShowRenewalModal(true) called');
      
      // Clean up the URL after a delay to ensure state updates first
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('renew');
        window.history.replaceState({}, '', url);
        console.log('[Dashboard] URL cleaned up');
      }, 100);
    }
  }, [searchParams]);

  // Add a separate effect to track state changes
  useEffect(() => {
    console.log('[Dashboard] showRenewalModal state changed to:', showRenewalModal);
  }, [showRenewalModal]);

  const handleRenewalModalClose = () => {
    console.log('[Dashboard] Closing renewal modal');
    setShowRenewalModal(false);
  };

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
