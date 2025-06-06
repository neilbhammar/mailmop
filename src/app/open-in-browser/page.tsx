'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLinkIcon, CopyIcon, ChevronDownIcon } from 'lucide-react'
import { getEmbeddedBrowserName, getSystemBrowserName, isEmbeddedBrowser } from '@/lib/utils/embeddedBrowser'
import { useMounted } from '@/hooks/useMounted'

export default function OpenInBrowserPage() {
  const mounted = useMounted()
  const [detectedApp, setDetectedApp] = useState('')
  const [systemBrowser, setSystemBrowser] = useState('')
  const [isCurrentlyEmbedded, setIsCurrentlyEmbedded] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isCurrentlyEmbedded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Perfect!</h1>
          <p className="text-gray-600 mb-4">You're in a compatible browser.</p>
          <p className="text-sm text-gray-500">Redirecting to MailMop...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 py-6 border-b border-gray-100">
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
      </header>

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="max-w-sm mx-auto text-center space-y-8">
          
          {/* Icon & Title */}
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
              <ExternalLinkIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Open in {systemBrowser}
              </h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                Google sign-in doesn't work inside {detectedApp} for security reasons
              </p>
            </div>
          </div>

          {/* Main Instructions */}
          <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-3">
                In {detectedApp}:
              </div>
            </div>

            {(detectedApp === 'Facebook' || detectedApp === 'LinkedIn') ? (
              // Specific instructions for Facebook/LinkedIn
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <span className="text-gray-700">Tap the <strong>three dots (⋯)</strong> in the top right</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <span className="text-gray-700">Select <strong>"Open in {systemBrowser}"</strong></span>
                </div>
              </div>
            ) : (
              // Generic instructions for other apps
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <span className="text-gray-700">Look for a share or menu button</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <span className="text-gray-700">Select <strong>"Open in {systemBrowser}"</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Fallback Toggle */}
          <div className="border-t border-gray-100 pt-6">
            <button
              onClick={() => setShowFallback(!showFallback)}
              className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors mx-auto"
            >
              <span className="text-sm">Don't see that option?</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showFallback ? 'rotate-180' : ''}`} />
            </button>

            {showFallback && (
              <div className="mt-6 space-y-6 text-left">
                {/* Copy URL */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">1. Copy this URL</h3>
                  <button
                    onClick={handleCopyUrl}
                    className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded-lg py-3 px-4"
                  >
                    <CopyIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-mono text-gray-700">
                      {copiedUrl ? '✓ Copied!' : 'mailmop.com'}
                    </span>
                  </button>
                </div>

                {/* Manual steps */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">2. Open manually</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>• Close {detectedApp}</div>
                    <div>• Open {systemBrowser} from your home screen</div>
                    <div>• Paste the URL and press Enter</div>
                    <div>• Sign in with Google</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security note */}
          <div className="text-xs text-gray-500 leading-relaxed">
            🔒 This security measure is enforced by Google to protect your account
          </div>
        </div>
      </main>
    </div>
  )
} 