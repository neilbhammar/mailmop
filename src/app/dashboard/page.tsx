'use client'

import { useAuth } from '@/context/AuthProvider'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    console.log('[Dashboard] useAuth user →', user)

    if (user === null) {
      console.log('[Dashboard] No user. Redirecting...')
      router.push('/')
    } else if (user) {
      console.log('[Dashboard] User exists. Staying on page.')
    }

    setChecked(true)
  }, [user])

  if (!checked) {
    return <div className="p-8">Checking session...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
      <p className="mt-2">Signed in as: {user?.email}</p>
    </div>
  )
}
