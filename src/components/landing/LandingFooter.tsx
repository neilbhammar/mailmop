'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LockClosedIcon } from '@radix-ui/react-icons'
import { useTheme } from 'next-themes'
import { useMounted } from '@/hooks/useMounted'

export default function LandingFooter() {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8">
            {/* Logo and description */}
            <div className="mb-8 lg:mb-0 lg:max-w-xs">
              <Link href="/" className="inline-flex items-center">
                {mounted && (
                  <Image 
                    src={resolvedTheme === 'dark' ? '/darklogo.png' : '/logo10.png'}
                    alt="MailMop" 
                    width={140} 
                    height={140}
                    className="mr-3" 
                  />
                )}
                {!mounted && (
                  <Image 
                    src={'/logo10.png'}
                    alt="MailMop" 
                    width={140} 
                    height={140}
                    className="mr-3" 
                  />
                )}
              </Link>
              <p className="mt-3 text-gray-600 dark:text-slate-400 text-sm">
                Clean up your Gmail inbox without compromising your privacy.
              </p>
              
              <div className="mt-4 flex items-center gap-4">
                <a href="https://github.com/neilbhammar/mailmop" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Navigation Links - Now 4 columns including Blog */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 flex-1 lg:max-w-2xl">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-4">Product</h3>
                <ul className="space-y-3">
                  <li><a href="#how-it-works" className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">How it works</a></li>
                  <li><a href="#pricing" className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Pricing</a></li>
                  <li><a href="#faq" className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">FAQ</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-4">Resources</h3>
                <ul className="space-y-3">
                  <li><Link href="/blog" className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Gmail Tips</Link></li>
                  <li><Link href="/blog/gmail-storage-full" className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Storage Full?</Link></li>
                  <li><Link href="/blog/clean-up-gmail" className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Cleanup Guide</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-4">Legal</h3>
                <ul className="space-y-3">
                  <li><Link href="/privacy" className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Terms of Service</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-4">Contact</h3>
                <ul className="space-y-3">
                  <li>
                    <a 
                      href="mailto:hi@mailmop.app" 
                      className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      help@mailmop.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 dark:border-slate-800 pt-8 pb-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">
                &copy; {new Date().getFullYear()} MailMop. All rights reserved.
              </p>
              <div className="flex items-center mt-4 md:mt-0">
                <div className="text-sm text-gray-400 dark:text-slate-500 flex items-center">
                  <LockClosedIcon className="h-4 w-4 mr-1 text-green-500 dark:text-green-400" />
                  <span>Privacy-First & Secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 