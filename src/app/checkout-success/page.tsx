'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

export default function CheckoutSuccess() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    console.log('[CheckoutSuccess] Page loaded with session:', sessionId)
    
    // Check if this page was opened in a new tab from checkout
    const isNewTab = window.opener !== null
    
    if (isNewTab) {
      console.log('[CheckoutSuccess] Running in new tab, sending success message to parent')
      
      // Send success message to parent window immediately
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { 
            type: 'MAILMOP_CHECKOUT_SUCCESS',
            sessionId: sessionId 
          },
          window.location.origin
        )
        console.log('[CheckoutSuccess] Message sent to parent window')
      }
      
      // Close this tab quickly
      setTimeout(() => {
        console.log('[CheckoutSuccess] Closing tab')
        window.close()
      }, 500)
    } else {
      // If somehow accessed directly, redirect to dashboard
      console.log('[CheckoutSuccess] Direct access detected, redirecting to dashboard')
      window.location.href = '/dashboard?checkout=success'
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Payment Successful!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Thank you for upgrading to MailMop Pro
        </p>
        <div className="flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Completing setup...
        </div>
      </div>
    </div>
  )
} 