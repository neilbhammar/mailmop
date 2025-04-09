'use client'

import { useAuth } from '@/context/AuthProvider'
import { useWhitelist } from '@/hooks/useWhitelist'
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BetaWaitlistModal } from '@/components/modals/BetaWaitlistModal'
import { GrantPermissionsModal } from '@/components/modals/GrantPermissionsModal'
import { EmailMismatchModal } from '@/components/modals/EmailMismatchModal'
import { TopBar } from '@/components/TopBar/TopBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const { checkWhitelist, isWhitelisted, isLoading: whitelistLoading } = useWhitelist()
  const { shouldShowPermissionsModal, shouldShowMismatchModal, gmailEmail } = useGmailPermissions()
  const router = useRouter()

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // If not authenticated, return null (will redirect in useEffect)
  if (!user) {
    return null
  }

  // Main app content that may be blurred
  const mainContent = (
    <div className="min-h-screen bg-white-50">
      <TopBar />
      <main className="px-4 pt-2 pb-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )

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
          supabaseEmail={user.email} 
          gmailEmail={gmailEmail} 
        />
      </>
    )
  }

  // If user needs to grant Gmail permissions, show blurred content + modal
  if (shouldShowPermissionsModal) {
    return (
      <>
        <div className="filter blur-sm pointer-events-none">
          {mainContent}
        </div>
        <GrantPermissionsModal />
      </>
    )
  }

  // User is whitelisted and has necessary permissions, show dashboard
  return mainContent
} 