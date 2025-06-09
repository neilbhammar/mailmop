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
import { ParserTester } from '@/components/dashboard/ParserTester'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'

export default function Dashboard() {
  const { user, session, plan } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showConfetti, setShowConfetti] = useState(false)
  const [showManageSubscriptionModal, setShowManageSubscriptionModal] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [showParserTester, setShowParserTester] = useState(false)
  const [windowWidth, windowHeight] = useWindowSize()

  // Effect for handling checkout success
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      logger.debug('Checkout success detected (direct access), showing modal and confetti', {
        component: 'Dashboard'
      });
      
      // This handles direct access to dashboard?checkout=success (fallback case)
      setShowConfetti(true);
      setShowManageSubscriptionModal(true);
      
      // Stop confetti after 5 seconds
      setTimeout(() => {
        logger.debug('Stopping confetti', { component: 'Dashboard' });
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
    const allParams = Object.fromEntries(searchParams.entries());
    
    logger.debug('Checking renewal parameter', {
      component: 'Dashboard',
      renewParam,
      allParams,
      currentShowRenewalModal: showRenewalModal
    });
    
    if (renewParam === 'true') {
      logger.debug('Renewal parameter detected, showing renewal modal', {
        component: 'Dashboard'
      });
      setShowRenewalModal(true);
      logger.debug('setShowRenewalModal(true) called', { component: 'Dashboard' });
      
      // Clean up the URL after a delay to ensure state updates first
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('renew');
        window.history.replaceState({}, '', url);
        logger.debug('URL cleaned up', { component: 'Dashboard' });
      }, 100);
    }
  }, [searchParams, showRenewalModal]);

  // Add a separate effect to track state changes
  useEffect(() => {
    logger.debug('showRenewalModal state changed', {
      component: 'Dashboard',
      showRenewalModal
    });
  }, [showRenewalModal]);

  const handleRenewalModalClose = () => {
    logger.debug('Closing renewal modal', { component: 'Dashboard' });
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
      
      {/* Toggle button for parser tester */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={() => setShowParserTester(!showParserTester)}
          className="text-xs"
        >
          {showParserTester ? 'Back to Dashboard' : 'Test Parser (Dev)'}
        </Button>
      </div>

      {showParserTester ? (
        <div className="max-w-7xl mx-auto">
          <ParserTester />
        </div>
      ) : (
        <>
          <Overview />
          <InboxAnalysisContainer />
        </>
      )}
      
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
