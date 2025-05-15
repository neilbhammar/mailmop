'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { LockClosedIcon } from '@radix-ui/react-icons'

export function BetaWaitlistModal() {
  const [copied, setCopied] = useState(false)
  const gridSize = 15; // Slightly larger grid for better effect
  const [mounted, setMounted] = useState(false)
  
  // Set mounted state after initial render to enable animations
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const copyEmail = () => {
    navigator.clipboard.writeText('hi@mailmop.com')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md dark:backdrop-blur-lg flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 20,
          duration: 0.5
        }}
        className="w-full max-w-xl mx-auto relative my-4 md:my-0"
      >
        {/* Background card with premium gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/90 dark:from-slate-800/90 dark:via-slate-850/90 dark:to-slate-900/90 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,70,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden">
          {/* Subtle gradient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-indigo-400/5 dark:from-blue-700/10 dark:via-transparent dark:to-indigo-700/10"></div>
          
          {/* Glass effect */}
          <div className="absolute inset-0 backdrop-blur-[2px] bg-white/20 dark:bg-slate-700/10 dark:backdrop-blur-[3px]"></div>
          
          {/* Subtle shine effect */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-blue-100/0 via-blue-100/10 to-blue-100/0 dark:from-slate-600/0 dark:via-slate-600/10 dark:to-slate-600/0 opacity-0 group-hover:opacity-100 animate-shimmer"></div>
        </div>
        
        {/* Pulsing Dot Grid Background */}
        <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute inset-0 w-full h-full grid" style={{gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)`}}>
            {mounted && Array(gridSize * gridSize).fill(0).map((_, index) => {
              const rowIndex = Math.floor(index / gridSize);
              const colIndex = index % gridSize;
              return (
                <div 
                  key={`dot-${rowIndex}-${colIndex}`}
                  className="w-full h-full flex items-center justify-center"
                >
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.01 * (rowIndex + colIndex),
                      duration: 0.5
                    }}
                  >
                    <div 
                      className="dot-pulse bg-blue-500 dark:bg-blue-400 rounded-full"
                      style={{
                        width: '2.5px',
                        height: '2.5px',
                        animationDelay: `${(rowIndex * 0.1 + colIndex * 0.07).toFixed(2)}s`,
                      }}
                    />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decorative elements - larger, more subtle */}
        <div className="absolute -z-10 -left-12 sm:-left-24 -top-20 w-60 sm:w-80 h-60 sm:h-80 bg-gradient-to-r from-blue-300/30 to-blue-200/30 dark:from-blue-800/20 dark:to-blue-700/20 rounded-full filter blur-3xl opacity-30 dark:opacity-20 animate-pulse-slow"></div>
        <div className="absolute -z-10 -right-12 sm:-right-24 bottom-0 w-60 sm:w-80 h-60 sm:h-80 bg-gradient-to-r from-indigo-300/30 to-purple-200/30 dark:from-indigo-800/20 dark:to-purple-700/20 rounded-full filter blur-3xl opacity-30 dark:opacity-20 animate-pulse-slower delay-1000"></div>
        
        {/* Content container */}
        <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-14">
          {/* Badge */}
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
            className="flex justify-center mb-6 sm:mb-8"
          >
            <div className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1.5 bg-gradient-to-r from-blue-50/80 to-blue-100/80 dark:from-slate-700/80 dark:to-slate-600/80 backdrop-blur-sm text-blue-800 dark:text-blue-300 text-xs sm:text-sm font-medium rounded-full border border-blue-200/80 dark:border-slate-500/80 shadow-sm">
              <LockClosedIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-2" />
              <span className="mr-1.5 sm:mr-2">Secure</span>
              <span className="opacity-70 text-blue-400 dark:text-slate-500">•</span>
              <span className="ml-1.5 sm:ml-2">Privacy-First</span>
            </div>
          </motion.div>
          
          {/* Heading */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
            className="text-center mb-6 sm:mb-8"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] leading-tight font-bold text-gray-900 dark:text-slate-100 tracking-tight mb-3 sm:mb-5">
              Thanks for joining the waitlist
            </h2>
            
            <p className="text-base sm:text-lg text-gray-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              MailMop should be out of beta soon. As soon as it passes Google's final security review and we can add more users, I'll email you to let you know!
            </p>
          </motion.div>
          
          {/* Early access callout */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
            className="mb-8 sm:mb-10 md:mb-14 text-center"
          >
            <div className="bg-blue-50/50 dark:bg-slate-700/40 backdrop-blur-[1px] border border-blue-100/80 dark:border-slate-600/80 rounded-xl p-4 sm:p-6 max-w-md mx-auto">
              <p className="text-gray-700 dark:text-slate-300 text-sm sm:text-base font-medium leading-relaxed mb-2">
                Want early access? Shoot an email to{' '}
                <button 
                  className="relative inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 group cursor-pointer transition-colors"
                  onClick={copyEmail}
                  aria-label="Copy email address"
                >
                  neil@mailmop.com
                  <span className="ml-1.5 inline-flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.span
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CheckIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 dark:text-green-400" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CopyIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-70 group-hover:opacity-100" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  {/* Underline animation */}
                  <span className="absolute -bottom-0.5 left-0 w-full h-px bg-gradient-to-r from-blue-400/30 via-blue-400/70 to-blue-400/30 dark:from-blue-500/30 dark:via-blue-500/70 dark:to-blue-500/30 group-hover:bg-gradient-to-r group-hover:from-blue-500/50 group-hover:via-blue-500/80 group-hover:to-blue-500/50 dark:group-hover:from-blue-400/50 dark:group-hover:via-blue-400/80 dark:group-hover:to-blue-400/50 transition-colors"></span>
                </button>{' '}
                with subject "Beta Access" and we'll try and get you in ASAP.
              </p>
            </div>
            
            {/* Copy feedback - with fixed height to prevent layout shift */}
            <div className="h-5 mt-2">
              <AnimatePresence>
                {copied && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-green-600 dark:text-green-500 font-medium"
                  >
                    Email copied to clipboard!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
          {/* Sign out button */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex justify-center"
          >
            <button
              onClick={handleSignOut}
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-sm flex items-center gap-2 group transition-colors relative overflow-hidden"
              aria-label="Sign out"
            >
              <span className="relative z-10">Sign out</span>
              <svg 
                className="w-3 h-3 sm:w-3.5 sm:h-3.5 transform group-hover:translate-x-0.5 transition-transform relative z-10" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="absolute inset-0 w-full h-full bg-gray-100 opacity-0 group-hover:opacity-100 dark:bg-gray-700/20 rounded-full transition-opacity duration-300 -z-0"></span>
            </button>
          </motion.div>
        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 6s infinite;
        }
        
        @keyframes pulseDotAnimation {
          0%, 100% {
            transform: scale(0.5);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.8;
          }
        }
        
        .dot-pulse {
          animation: pulseDotAnimation 4s infinite ease-in-out;
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        
        .animate-pulse-slower {
          animation: pulse-slower 12s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
} 