'use client'

import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { CheckIcon, ChevronRightIcon, ShieldIcon, MailIcon, SparklesIcon, TrashIcon, BanIcon, ExternalLinkIcon, RefreshCw, SendIcon, FilterIcon, ChevronDownIcon } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAccessToken } from '@/lib/gmail/token'
import { fetchGmailStats } from '@/lib/gmail/fetchGmailStats'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'

interface Step1Props {
  onNext: () => void;
  /**
   * Optional override. If provided, will force first-time user state. If omitted, we auto-detect
   * based on the Supabase user `created_at` timestamp (<=24h old).
   */
  isFirstTimeUser?: boolean;
}

export default function Step1_ConnectGmail({ onNext, isFirstTimeUser }: Step1Props) {
  const { requestPermissions, isLoading } = useGmailPermissions()
  const [currentAnimation, setCurrentAnimation] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [fetchingStats, setFetchingStats] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { user } = useAuth()
  const [whyOpen, setWhyOpen] = useState(false)
  
  // Auto-detect first-time users (account created ≤ 24h ago) if prop not supplied
  const computedFirstTime = useMemo(() => {
    if (!user?.created_at) return false
    const created = new Date(user.created_at).getTime()
    return Date.now() - created < 24 * 60 * 60 * 1000
  }, [user?.created_at])

  // Final flag: explicit prop overrides auto detection when defined
  const firstTime = isFirstTimeUser ?? computedFirstTime
  
  const handleConnect = async () => {
    try {
      const success = await requestPermissions()
      if (success) {
        // Fetch Gmail stats before proceeding to the next step
        const accessToken = await getAccessToken().catch(() => null);
        if (accessToken) {
          // Show loading state while fetching stats
          setFetchingStats(true);
          try {
            // Fetch and store the stats in localStorage
            await fetchGmailStats(accessToken);
            // Now proceed to next step
            onNext();
          } catch (error) {
            console.error('Failed to fetch Gmail stats:', error);
            // Still proceed to next step even if stats fetch fails
            onNext();
          } finally {
            setFetchingStats(false);
          }
        } else {
          onNext();
        }
      }
    } catch (error) {
      console.error('Failed to connect to Gmail:', error)
    }
  }

  useEffect(() => {
    if (!firstTime) {
    const startAutoRotation = () => {
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setCurrentAnimation(prev => (prev + 1) % 3);
        }
      }, 4250);
    };
    
    startAutoRotation();
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    }
  }, [isPaused, firstTime]);

  return (
    <div className="h-full w-full flex items-center justify-center">
      {/* Content area - fixed spacing and centering */}
      <div className={cn(
        "px-6 lg:px-8 py-4 lg:py-6 flex items-center justify-center overflow-y-auto",
        firstTime 
          ? "w-full max-w-4xl mx-auto" // Centered with max width for first-time users
          : "w-full xl:w-1/2 2xl:w-1/2" // 50% width on xl+ for returning users
      )}>
        <div className={cn(
          "flex flex-col justify-center h-full space-y-3 lg:space-y-4 w-full",
          firstTime 
            ? "max-w-2xl mx-auto" // Centered for first-time users
            : "max-w-lg" // Keep existing width for returning users
        )}>
          {/* Google Logo */}
          <div className="flex justify-center">
            <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 rounded-full bg-blue-50 dark:bg-slate-700 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" className="lg:w-6 lg:h-6 xl:w-8 xl:h-8">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
          </div>
          
          {/* Title and description - Different for first-time users */}
          <div className="text-center">
            {firstTime ? (
              <>
                <h1 className="text-lg lg:text-xl xl:text-3xl font-semibold text-gray-900 dark:text-slate-100 mb-2 lg:mb-3">
                🎉 Welcome! Let's connect your inbox
                </h1>
                <p className="text-sm lg:text-base xl:text-lg text-gray-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto mb-6">
                  You've successfully created your MailMop account. Now MailMop needs permission to securely analyze your inbox and help you clean it.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-base lg:text-lg xl:text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-1 lg:mb-2">
                  Securely Connect Your Inbox
                </h1>
            <p className="text-xs lg:text-sm xl:text-base text-gray-600 dark:text-slate-400 leading-relaxed">
            MailMop analyzes email metadata to identify who's cluttering your inbox and help you take action, all within your browser.
            </p>
              </>
            )}
          </div>
          
          {/* First-time user simplified look */}
          {firstTime ? (
            <div className="space-y-8">
              {/* Three quick value props */}
              <div className="flex flex-col sm:flex-row justify-center gap-6 sm:gap-12">
                <div className="flex flex-col items-center text-center max-w-[140px]">
                  <SparklesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Instant insights</p>
                  <span className="text-xs text-gray-500 dark:text-slate-400">See who's filling your inbox.</span>
                </div>
                <div className="flex flex-col items-center text-center max-w-[140px]">
                  <TrashIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">One-click cleanup</p>
                  <span className="text-xs text-gray-500 dark:text-slate-400">Bulk delete & mark read.</span>
                </div>
                <div className="flex flex-col items-center text-center max-w-[140px]">
                  <ShieldIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Privacy built-in</p>
                  <span className="text-xs text-gray-500 dark:text-slate-400">Everything stays local.</span>
                </div>
              </div>

              {/* Smooth Collapsible details */}
              <CollapsiblePrimitive.Root open={whyOpen} onOpenChange={setWhyOpen}>
                <motion.div
                  className="mx-auto max-w-md rounded-lg border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800/30"
                  initial={false}
                  animate={{ overflow: 'hidden', height: 'auto' }}
                >
                  {/* Trigger */}
                  <CollapsiblePrimitive.Trigger className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium leading-6 text-gray-900 dark:text-slate-100 cursor-pointer select-none">
                    Why does MailMop need Gmail access?
                    <ChevronDownIcon className={cn("h-4 w-4 transform transition-transform", whyOpen && 'rotate-180')} />
                  </CollapsiblePrimitive.Trigger>
                  <AnimatePresence initial={false}>
                    {whyOpen && (
                      <CollapsiblePrimitive.Content asChild forceMount>
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="px-4 pb-4 pt-2 space-y-3 text-xs text-gray-600 dark:text-slate-400"
                        >
                          <div className="flex items-center gap-2"><MailIcon className="w-4 h-4 text-blue-500"/><span>Read metadata only for pattern analysis.</span></div>
                          <div className="flex items-center gap-2"><TrashIcon className="w-4 h-4 text-red-500"/><span>Bulk delete without leaving your browser.</span></div>
                          <div className="flex items-center gap-2"><SendIcon className="w-4 h-4 text-emerald-500"/><span>Send unsubscribe requests in one click.</span></div>
                          <div className="flex items-center gap-2"><FilterIcon className="w-4 h-4 text-purple-500"/><span>Create filters & labels automatically.</span></div>
                          <p className="pt-2 text-[10px] leading-4 text-gray-400 dark:text-slate-500">Access is entirely client-side—no storage or processing on our servers.</p>
                        </motion.div>
                      </CollapsiblePrimitive.Content>
                    )}
                  </AnimatePresence>
                </motion.div>
              </CollapsiblePrimitive.Root>
            </div>
          ) : (
            /* Existing benefits for returning users */
          <div className="bg-white-50 dark:bg-slate-800/50 rounded-lg lg:rounded-xl">
            <div className="py-1.5 lg:py-2 xl:py-3 px-2 lg:px-3 xl:px-6 space-y-1.5 lg:space-y-2 xl:space-y-3">
              <div 
                className="flex cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 p-1 lg:p-1.5 xl:p-2 rounded-md lg:rounded-lg transition-colors"
                onMouseEnter={() => {
                  setIsPaused(true);
                  setCurrentAnimation(0);
                }}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <CheckIcon size={8} className="lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="ml-1.5 lg:ml-2 xl:ml-3">
                  <h3 className="text-xs lg:text-sm xl:text-base font-medium text-gray-900 dark:text-slate-100">Your emails stay private</h3>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-slate-400">We process and store everything in your browser, not on MailMop servers.</p>
                </div>
              </div>
              
              <div 
                className="flex cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 p-1 lg:p-1.5 xl:p-2 rounded-md lg:rounded-lg transition-colors"
                onMouseEnter={() => {
                  setIsPaused(true);
                  setCurrentAnimation(1);
                }}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <CheckIcon size={8} className="lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="ml-1.5 lg:ml-2 xl:ml-3">
                  <h3 className="text-xs lg:text-sm xl:text-base font-medium text-gray-900 dark:text-slate-100">See who's cluttering your inbox</h3>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-slate-400">Analyze patterns and identify bulk senders to clean up your inbox efficiently.</p>
                </div>
              </div>
              
              <div 
                className="flex cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 p-1 lg:p-1.5 xl:p-2 rounded-md lg:rounded-lg transition-colors"
                onMouseEnter={() => {
                  setIsPaused(true);
                  setCurrentAnimation(2);
                }}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <CheckIcon size={8} className="lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="ml-1.5 lg:ml-2 xl:ml-3">
                  <h3 className="text-xs lg:text-sm xl:text-base font-medium text-gray-900 dark:text-slate-100">Clean up with one click</h3>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-slate-400">Easily delete, unsubscribe, and block unwanted senders in minutes, not hours.</p>
                </div>
              </div>
            </div>
          </div>
          )}
          
          {/* CTA Button */}
          <button
            onClick={handleConnect}
            disabled={isLoading || fetchingStats}
            className={cn(
              "flex w-full items-center justify-center rounded-lg lg:rounded-xl bg-blue-600 dark:bg-blue-500 text-white font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed",
              firstTime 
                ? "px-4 lg:px-6 py-2.5 lg:py-3 text-sm lg:text-base" // Smaller for mobile
                : "px-3 lg:px-4 xl:px-6 py-2 lg:py-2.5 xl:py-3 text-xs lg:text-sm xl:text-base" // Keep existing for returning users
            )}
          >
            {isLoading || fetchingStats ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 lg:h-5 lg:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className={firstTime ? "text-sm lg:text-base" : "text-xs lg:text-sm xl:text-base"}>
                  Connecting...
                </span>
              </div>
            ) : (
              <div className="flex items-center">
                <span className={firstTime ? "text-sm lg:text-base" : "text-xs lg:text-sm xl:text-base"}>
                  Connect my Gmail
                </span>
                <ChevronRightIcon className={cn(
                  "ml-2",
                  firstTime ? "w-4 h-4 lg:w-5 lg:h-5" : "w-3 h-3 lg:w-4 lg:h-4"
                )} />
              </div>
            )}
          </button>
          
          {/* Security and trust indicators */}
          {firstTime ? (
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center space-x-1">
                <ShieldIcon className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Secure connection. All processing in your browser.
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                You can revoke access anytime in your MailMop settings.
              </p>
            </div>
          ) : (
          <div className="text-center space-y-1 lg:space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <ShieldIcon size={8} className="lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 text-gray-400 dark:text-slate-500" />
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Secure connection. All processing in your browser.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              You can revoke access anytime in your MailMop settings.
            </p>
          </div>
          )}
        </div>
      </div>
      
      {/* Right side - Animations only for returning users */}
      {!firstTime && (
      <div 
        className="hidden xl:flex xl:w-1/2 2xl:w-1/2 h-full bg-slate-50 dark:bg-slate-800/70 items-center justify-center p-4 xl:p-6 relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="w-full max-w-lg h-full flex flex-col">
          {/* Main content area with fixed spacing from top */}
          <div className="pt-12 xl:pt-20">
            <AnimatePresence mode="wait">
              {/* Connect Animation */}
              {currentAnimation === 0 && (
                <motion.div 
                  key="connect"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full"
                >
                  <div className="mb-10 text-center">
                    <div className="inline-flex items-center px-4 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded-full">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 dark:bg-blue-400 text-white flex items-center justify-center mr-2 text-xs font-bold">1</span>
                      <span className="font-medium">Connect</span>
                      <RefreshCw className="h-4 w-4 text-blue-800 dark:text-blue-300 ml-1.5" />
                    </div>
                  </div>
                  
                  <div className="mt-2.5 rounded-2xl bg-white dark:bg-slate-700/50 shadow-lg dark:shadow-slate-900/30 border border-gray-100 dark:border-slate-700 overflow-hidden">
                    {/* Gmail OAuth animation */}
                    <div className="p-6 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mb-5 relative overflow-hidden">
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-slate-500/50 to-transparent opacity-50"
                          animate={{
                            x: ['-100%', '100%']
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        />
                        <motion.div
                          animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.9, 1, 0.9]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <ShieldIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 drop-shadow-lg" />
                        </motion.div>
                      </div>
                      
                      <motion.div 
                        animate={{ 
                          boxShadow: ["0px 0px 0px rgba(59, 130, 246, 0)", "0px 0px 20px rgba(59, 130, 246, 0.3)", "0px 0px 0px rgba(59, 130, 246, 0)"]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          repeatType: "loop" 
                        }}
                        className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-5 mb-6 relative"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-blue-100 dark:bg-blue-500/20 p-2">
                            <ShieldIcon className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-medium text-blue-900 dark:text-blue-200">Secure Connection</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-400">Encrypted connection and client-side processing</p>
                          </div>
                        </div>
                        
                        <motion.div 
                          className="absolute inset-0"
                          animate={{ 
                            borderColor: ["rgba(59, 130, 246, 0)", "rgba(59, 130, 246, 0.5)", "rgba(59, 130, 246, 0)"] 
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            repeatType: "loop" 
                          }}
                          style={{ borderRadius: "0.75rem", border: "2px solid rgba(59, 130, 246, 0)" }}
                        />
                      </motion.div>
                      
                      <div className="flex flex-col items-center gap-3 text-center mt-0">
                        <p className="text-gray-600 dark:text-slate-300 font-medium">MailMop connects securely to Gmail</p>
                        <div className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-full mt-2">
                          <CheckIcon size={12} />
                          <span>All processing stays local</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Analyze Animation */}
              {currentAnimation === 1 && (
                <motion.div 
                  key="analyze"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full"
                >
                  <div className="mb-10 text-center">
                    <div className="inline-flex items-center px-4 py-1.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 rounded-full">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500 dark:bg-indigo-400 text-white flex items-center justify-center mr-2 text-xs font-bold">2</span>
                      <span className="font-medium">Analyze</span>
                      <SparklesIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-300 ml-1.5" />
                    </div>
                  </div>
                  
                  <div className="mt-10 rounded-2xl bg-white dark:bg-slate-700/50 shadow-lg dark:shadow-slate-900/30 border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6">
                      {/* Browser animation with email analysis */}
                      <div className="bg-gray-50 dark:bg-slate-600/40 rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
                        {/* Header bar */}
                        <div className="h-8 bg-gray-100 dark:bg-slate-500/30 border-b border-gray-200 dark:border-slate-600 flex items-center px-4 relative">
                          {/* Dots on the left */}
                          <div className="flex space-x-1.5 absolute left-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-slate-500"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-slate-500"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-slate-500"></div>
                          </div>
                            {/* Centered Title */}
                          <div className="flex-1 text-center text-xs text-gray-500 dark:text-slate-400 font-medium pl-2">
                            Local Analysis
                          </div>
                        </div>

                        {/* Progress bars and status text */}
                        <div className="p-4">
                          <div className="space-y-2">
                            <motion.div 
                              className="h-2.5 bg-indigo-200 dark:bg-indigo-500/40 rounded-full"
                              initial={{ width: "0%" }}
                              animate={{ 
                                width: ["0%", "95%", "95%", "0%"]
                              }}
                              transition={{ 
                                duration: 4,
                                times: [0, 0.7, 0.9, 1],
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                            <motion.div 
                              className="h-2.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-full"
                              initial={{ width: "0%" }}
                              animate={{ 
                                width: ["0%", "85%", "85%", "0%"]
                              }}
                              transition={{ 
                                duration: 4,
                                times: [0, 0.7, 0.9, 1],
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2
                              }}
                            />
                            <motion.div 
                              className="h-2.5 bg-indigo-200 dark:bg-indigo-500/40 rounded-full"
                              initial={{ width: "0%" }}
                              animate={{ 
                                width: ["0%", "70%", "70%", "0%"]
                              }}
                              transition={{ 
                                duration: 4,
                                times: [0, 0.7, 0.9, 1],
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.4
                              }}
                            />
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-xs text-gray-500 dark:text-slate-400">Analyzing emails...</div>
                            <motion.div 
                              initial={{ opacity: 0.5 }}
                              animate={{ opacity: [0.5, 1, 1, 0.5] }}
                              transition={{ 
                                duration: 4,
                                times: [0, 0.7, 0.9, 1],
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="text-xs font-medium text-indigo-700 dark:text-indigo-300"
                            >
                              Browser only
                            </motion.div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center mt-6">
                        <p className="text-gray-600 dark:text-slate-300 font-medium">Fast analysis in your browser</p>
                        <div className="inline-flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-full mt-2">
                          <ShieldIcon size={12} />
                          <span>No cloud processing</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Clean Animation */}
              {currentAnimation === 2 && (
                <motion.div 
                  key="clean"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full"
                >
                  <div className="mb-10 text-center">
                    <div className="inline-flex items-center px-4 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-full">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 dark:bg-emerald-400 text-white flex items-center justify-center mr-2 text-xs font-bold">3</span>
                      <span className="font-medium">Clean</span>
                      <TrashIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-300 ml-1.5" />
                    </div>
                  </div>
                  
                  <div className="mt-10 rounded-2xl bg-white dark:bg-slate-700/50 shadow-lg dark:shadow-slate-900/30 border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6">
                      {/* Enhanced email cleanup animation with multiple action types */}
                      <div className="space-y-3">
                        {/* Email 1 - Delete */}
                        <motion.div 
                          className="flex items-center bg-gray-50 dark:bg-slate-600/40 rounded-lg p-3 border border-gray-200 dark:border-slate-600"
                          initial={{ x: 0, opacity: 1 }}
                          animate={{ 
                            x: ["0%", "0%", "-100%", "-100%", "0%"],
                            opacity: [1, 1, 0, 0, 1]
                          }}
                          transition={{ 
                            duration: 4,
                            times: [0, 0.2, 0.3, 0.9, 1],
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-500 mr-3"></div>
                          <div className="flex-1">
                            <div className="h-2.5 bg-gray-200 dark:bg-slate-500 rounded w-2/3 mb-1.5"></div>
                            <div className="h-2 bg-gray-100 dark:bg-slate-600 rounded w-1/3"></div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="px-2 py-0.5 bg-red-50 dark:bg-red-500/10 rounded-md text-xs font-medium text-red-600 dark:text-red-400">Delete</div>
                            <div className="bg-red-100 dark:bg-red-500/20 h-7 w-7 rounded-full flex items-center justify-center">
                              <TrashIcon className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                            </div>
                          </div>
                        </motion.div>
                        
                        {/* Email 2 - Unsubscribe */}
                        <motion.div 
                          className="flex items-center bg-gray-50 dark:bg-slate-600/40 rounded-lg p-3 border border-gray-200 dark:border-slate-600"
                          initial={{ x: 0, opacity: 1 }}
                          animate={{ 
                            x: ["0%", "0%", "0%", "-100%", "-100%", "0%"],
                            opacity: [1, 1, 1, 0, 0, 1]
                          }}
                          transition={{ 
                            duration: 4,
                            times: [0, 0.3, 0.35, 0.45, 0.9, 1],
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-500 mr-3"></div>
                          <div className="flex-1">
                            <div className="h-2.5 bg-gray-200 dark:bg-slate-500 rounded w-1/2 mb-1.5"></div>
                              <div className="h-2 bg-gray-100 dark:bg-slate-600 rounded w-2/3"></div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400">Unsubscribe</div>
                            <div className="bg-blue-100 dark:bg-blue-500/20 h-7 w-7 rounded-full flex items-center justify-center">
                              <ExternalLinkIcon className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                            </div>
                          </div>
                        </motion.div>
                        
                        {/* Email 3 - Block */}
                        <motion.div 
                          className="flex items-center bg-gray-50 dark:bg-slate-600/40 rounded-lg p-3 border border-gray-200 dark:border-slate-600"
                          initial={{ x: 0, opacity: 1 }}
                          animate={{ 
                            x: ["0%", "0%", "0%", "0%", "-100%", "-100%", "0%"],
                            opacity: [1, 1, 1, 1, 0, 0, 1]
                          }}
                          transition={{ 
                            duration: 4,
                            times: [0, 0.45, 0.5, 0.55, 0.65, 0.9, 1],
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-500 mr-3"></div>
                          <div className="flex-1">
                            <div className="h-2.5 bg-gray-200 dark:bg-slate-500 rounded w-3/5 mb-1.5"></div>
                            <div className="h-2 bg-gray-100 dark:bg-slate-600 rounded w-2/5"></div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="px-2 py-0.5 bg-orange-50 dark:bg-orange-500/10 rounded-md text-xs font-medium text-orange-600 dark:text-orange-400">Block</div>
                            <div className="bg-orange-100 dark:bg-orange-500/20 h-7 w-7 rounded-full flex items-center justify-center">
                              <BanIcon className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      
                      <div className="text-center mt-6">
                          <p className="text-gray-600 dark:text-slate-300 font-medium">Clean up your inbox in minutes</p>
                        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full mt-2">
                          <CheckIcon size={12} />
                            <span>Bulk actions available</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </div>
      )}
    </div>
  )
} 