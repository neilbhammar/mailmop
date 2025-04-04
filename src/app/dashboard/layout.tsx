'use client'

import { useAuth } from '@/context/AuthProvider'
import { useWhitelist } from '@/hooks/useWhitelist'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BetaWaitlistModal } from '@/components/modals/BetaWaitlistModal'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const { checkWhitelist, isWhitelisted, isLoading: whitelistLoading } = useWhitelist()
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

  // If whitelist check is complete and user is not whitelisted, show modal
  if (isWhitelisted === false) {
    return (
      <>
        <div className="filter blur-sm pointer-events-none">
          {children}
        </div>
        <BetaWaitlistModal />
      </>
    )
  }

  // User is whitelisted (or check not complete), show dashboard
  return <>{children}</>
} 