'use client'

import { useAuth } from '@/context/AuthProvider'
import { useWhitelist } from '@/hooks/useWhitelist'
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BetaWaitlistModal } from '@/components/modals/BetaWaitlistModal'
import { EmailMismatchModal } from '@/components/modals/EmailMismatchModal'
import { MobileBlockingModal } from '@/components/modals/MobileBlockingModal'
import { TopBar } from '@/components/TopBar/TopBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const { checkWhitelist, isWhitelisted, isLoading: whitelistLoading } = useWhitelist()
  const { 
    shouldShowMismatchModal, 
    gmailEmail,
    hideMismatchModal
  } = useGmailPermissions()
  const isMobile = useMobileDetection()
  const router = useRouter()

  // Warn users before closing tab if there are active queue operations
  useBeforeUnloadWarning()

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push('/')
      return
    }

    if (user?.email) {
      checkWhitelist(user.email)
    }
  }, [user, authLoading, router, checkWhitelist])

  // Show loading state while checking auth or whitelist
  if (authLoading || whitelistLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-slate-300"></div>
      </div>
    )
  }

  // If not authenticated, return null (will redirect in useEffect)
  if (!user) {
    return null
  }

  // Main app content that may be blurred
  const mainContent = (
    <div className="bg-white-50 dark:bg-slate-900">
      <TopBar />
      <main className="px-4 pt-2">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )

  // If user is on mobile, show blurred content + mobile blocking modal
  if (isMobile) {
    return (
      <>
        <div className="filter blur-sm pointer-events-none">
          {mainContent}
        </div>
        <MobileBlockingModal />
      </>
    )
  }

  // If whitelist check is complete and user is not whitelisted, show blurred content + modal
  if (isWhitelisted === false) {
    return (
      <>
        <div className="filter blur-sm pointer-events-none">
          {mainContent}
        </div>
        <BetaWaitlistModal />
      </>
    )
  }

  // If there's an email mismatch, show blurred content + modal
  if (shouldShowMismatchModal && user.email && gmailEmail) {
    return (
      <>
        <div className="filter blur-sm pointer-events-none">
          {mainContent}
        </div>
        <EmailMismatchModal 
          isOpen={shouldShowMismatchModal}
          onClose={hideMismatchModal}
          supabaseEmail={user.email} 
          gmailEmail={gmailEmail} 
        />
      </>
    )
  }

  // User is whitelisted and has necessary permissions, show dashboard
  return mainContent
} 