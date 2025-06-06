'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLinkIcon, SmartphoneIcon, MonitorIcon, ArrowRightIcon, RefreshCwIcon, CopyIcon } from 'lucide-react'
import { getEmbeddedBrowserName, getSystemBrowserName, isEmbeddedBrowser } from '@/lib/utils/embeddedBrowser'
import { useMounted } from '@/hooks/useMounted'

export default function OpenInBrowserPage() {
  const mounted = useMounted()
  const [detectedApp, setDetectedApp] = useState('')
  const [systemBrowser, setSystemBrowser] = useState('')
  const [isCurrentlyEmbedded, setIsCurrentlyEmbedded] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  useEffect(() => {
    if (mounted) {
      const embedded = isEmbeddedBrowser()
      setIsCurrentlyEmbedded(embedded)
      setDetectedApp(getEmbeddedBrowserName())
      setSystemBrowser(getSystemBrowserName())
      
      // If they're not actually in an embedded browser, redirect to home
      if (!embedded) {
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
    }
  }, [mounted])

  const handleOpenInBrowser = () => {
    const url = 'https://mailmop.com'
    
    try {
      // Try multiple methods to open in external browser
      
      // Method 1: window.open with specific parameters
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
      
      // Method 2: If window.open doesn't work, try location.href
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        window.location.href = url
      }
    } catch (error) {
      // Method 3: Fallback to location.href
      window.location.href = url
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText('https://mailmop.com')
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = 'https://mailmop.com'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isCurrentlyEmbedded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Perfect!</h1>
          <p className="text-gray-600 dark:text-slate-400 mb-4">You're already in a compatible browser.</p>
          <p className="text-sm text-gray-500 dark:text-slate-500">Redirecting you to MailMop...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="container mx-auto px-4">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/logo10.png"
              alt="MailMop"
              width={120}
              height={30}
              className="h-7 w-auto"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-white/20">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLinkIcon className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              Open in {systemBrowser}
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Google sign-in doesn't work inside {detectedApp} for security reasons
            </p>
          </div>

          {/* Explanation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Why this happens
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
              Google requires OAuth flows to run in full system browsers (like {systemBrowser}) rather than embedded app browsers to prevent phishing and security attacks. This protects your Google account.
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">To continue with MailMop:</h3>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="text-gray-700 dark:text-slate-300 font-medium">
                  Tap the button below to open MailMop in {systemBrowser}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="text-gray-700 dark:text-slate-300 font-medium">
                  Sign in with Google when prompted
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="text-gray-700 dark:text-slate-300 font-medium">
                  Start cleaning your Gmail inbox!
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            <button
              onClick={handleOpenInBrowser}
              className="inline-flex items-center justify-center w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl group"
            >
              <ExternalLinkIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              <span>Open MailMop in {systemBrowser}</span>
              <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            
            {/* Alternative: Copy URL button */}
            <button
              onClick={handleCopyUrl}
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-300 group"
            >
              <CopyIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              <span>{copiedUrl ? 'URL Copied!' : 'Copy URL to Paste in Browser'}</span>
            </button>
            
            <p className="text-xs text-gray-500 dark:text-slate-500">
              If the first button doesn't work, use the copy button and paste "mailmop.com" in {systemBrowser}
            </p>
          </div>

          {/* Device-specific tips */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-colors flex items-center">
                <span>Need help opening in {systemBrowser}?</span>
                <svg className="w-4 h-4 ml-2 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 space-y-3 text-sm text-gray-600 dark:text-slate-400">
                {systemBrowser.includes('Safari') && (
                  <div className="flex items-start space-x-2">
                    <SmartphoneIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">On iPhone/iPad:</p>
                      <p>Look for the "Open in Safari" option in the share menu or toolbar, or copy the URL and paste it in Safari</p>
                    </div>
                  </div>
                )}
                {systemBrowser.includes('Chrome') && (
                  <div className="flex items-start space-x-2">
                    <SmartphoneIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">On Android:</p>
                      <p>Look for "Open in Chrome" or "Open in browser" in the menu, or copy the URL and paste it in Chrome</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <MonitorIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Alternative method:</p>
                    <p>Copy this URL: <code className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">mailmop.com</code> and paste it into your browser</p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-slate-500">
            🔒 This security measure protects your Google account and is enforced by Google, not MailMop
          </p>
        </div>
      </main>
    </div>
  )
} 