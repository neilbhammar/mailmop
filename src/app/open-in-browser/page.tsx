'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLinkIcon, SmartphoneIcon, MonitorIcon, ArrowRightIcon, RefreshCwIcon, CopyIcon, ShareIcon } from 'lucide-react'
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
              Please open in {systemBrowser}
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

          {/* Step-by-step instructions */}
          <div className="space-y-6 mb-8">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Follow these steps:</h3>
            
            {/* Step 1: Copy URL */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-slate-100 font-semibold mb-3">
                    Copy MailMop's URL
                  </p>
                  <button
                    onClick={handleCopyUrl}
                    className="inline-flex items-center justify-center w-full px-4 py-3 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-300 group border border-gray-200 dark:border-slate-600"
                  >
                    <CopyIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-sm">{copiedUrl ? '✓ Copied: mailmop.com' : 'Copy: mailmop.com'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Open Browser */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-slate-100 font-semibold mb-2">
                    Open {systemBrowser}
                  </p>
                  
                  {/* Specific instructions for Facebook and LinkedIn */}
                  {(detectedApp === 'Facebook' || detectedApp === 'LinkedIn') && (
                    <div className="text-sm text-gray-700 dark:text-slate-300 space-y-2">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-600">
                        <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">In {detectedApp}:</p>
                        <div className="space-y-1">
                          <p className="flex items-center">
                            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">1</span>
                            Hit the <strong>three dots (⋯)</strong> in the top right corner
                          </p>
                          <p className="flex items-center">
                            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">2</span>
                            Click <strong>"Open in Browser"</strong> or <strong>"Open in {systemBrowser}"</strong>
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-400 italic">
                        If you don't see this option, use the manual method below ↓
                      </p>
                    </div>
                  )}
                  
                  {/* Generic instructions for other browsers */}
                  {detectedApp !== 'Facebook' && detectedApp !== 'LinkedIn' && (
                    <div className="text-sm text-gray-700 dark:text-slate-300 space-y-1">
                      {systemBrowser.includes('Safari') && (
                        <>
                          <p className="flex items-center">
                            <ShareIcon className="w-4 h-4 mr-2 text-blue-600" />
                            Look for a share/open icon in {detectedApp}
                          </p>
                          <p className="flex items-center">
                            <SmartphoneIcon className="w-4 h-4 mr-2 text-blue-600" />
                            Tap "Open in Safari" or "Open in Browser"
                          </p>
                        </>
                      )}
                      {systemBrowser.includes('Chrome') && (
                        <>
                          <p className="flex items-center">
                            <ShareIcon className="w-4 h-4 mr-2 text-blue-600" />
                            Look for a menu (⋮) in {detectedApp}
                          </p>
                          <p className="flex items-center">
                            <SmartphoneIcon className="w-4 h-4 mr-2 text-blue-600" />
                            Tap "Open in Chrome" or "Open in Browser"
                          </p>
                        </>
                      )}
                      <p className="text-xs text-gray-600 dark:text-slate-400">
                        Or manually open {systemBrowser} and paste the URL
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Paste and Go */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-slate-100 font-semibold mb-2">
                    Paste and visit MailMop
                  </p>
                  <div className="text-sm text-gray-700 dark:text-slate-300 space-y-1">
                    <p>• Paste <code className="bg-white dark:bg-slate-700 px-1 py-0.5 rounded text-xs border">mailmop.com</code> in the address bar</p>
                    <p>• Press Enter/Go</p>
                    <p>• Sign in with Google and start cleaning! 🧹</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative help */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-colors flex items-center">
                <span>Don't see an "Open in Browser" option?</span>
                <svg className="w-4 h-4 ml-2 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 space-y-3 text-sm text-gray-600 dark:text-slate-400">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">Manual method:</p>
                  <ol className="space-y-1 text-sm">
                    <li>1. Copy <strong>mailmop.com</strong> using the button above ☝️</li>
                    <li>2. Close or minimize {detectedApp}</li>
                    <li>3. Open {systemBrowser} directly from your home screen</li>
                    <li>4. Paste <strong>mailmop.com</strong> in the address bar and press Enter</li>
                    <li>5. Sign in with Google and start cleaning! 🧹</li>
                  </ol>
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