'use client'

import { useAuth } from '@/context/AuthProvider'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Overview from '@/components/dashboard/Overview'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  // Only run this effect once on mount and when user changes from null to non-null or vice versa
  useEffect(() => {
    // Skip if we've already checked
    if (checked) return;

    console.log('[Dashboard] useAuth user →', user)

    if (user === null) {
      console.log('[Dashboard] No user. Redirecting...')
      router.push('/')
    } else if (user) {
      console.log('[Dashboard] User exists. Staying on page.')
    }

    setChecked(true)
  }, [user, router, checked])

  if (!checked || !user) {
    return <div>Checking session...</div>
  }

  return (
    <div className="container mx-auto px-4">
      <Overview />
    </div>
  )
}
