'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

/**
 * Modal that blocks mobile users and explains why MailMop should be used on desktop
 * This modal is shown when users try to access the dashboard on mobile devices
 */
export function MobileBlockingModal() {
  const gridSize = 15 // Grid size for the animated background
  const [mounted, setMounted] = useState(false)
  
  // Set mounted state after initial render to enable animations
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md dark:backdrop-blur-lg flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1]
          }}
          className="w-full max-w-lg mx-auto relative my-4 md:my-0"
        >
          {/* Background card with orange/amber gradient for warning */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/90 dark:from-slate-800/90 dark:via-slate-850/90 dark:to-slate-900/90 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,70,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden">
            {/* Subtle gradient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-transparent to-orange-400/5 dark:from-amber-700/10 dark:via-transparent dark:to-orange-700/10"></div>
            
            {/* Glass effect */}
            <div className="absolute inset-0 backdrop-blur-[2px] bg-white/20 dark:bg-slate-700/10 dark:backdrop-blur-[3px]"></div>
            
            {/* Subtle shine effect */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-amber-100/0 via-amber-100/10 to-amber-100/0 dark:from-slate-600/0 dark:via-slate-600/10 dark:to-slate-600/0 opacity-0 group-hover:opacity-100 animate-shimmer"></div>
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
                        duration: 0.5,
                        ease: "easeOut"
                      }}
                    >
                      <div 
                        className="dot-pulse bg-amber-500 dark:bg-amber-400 rounded-full"
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

          {/* Decorative elements */}
          <div className="absolute -z-10 -left-12 sm:-left-24 -top-20 w-60 sm:w-80 h-60 sm:h-80 bg-gradient-to-r from-amber-300/30 to-orange-200/30 dark:from-amber-800/20 dark:to-orange-700/20 rounded-full filter blur-3xl opacity-30 dark:opacity-20 animate-pulse-slow"></div>
          <div className="absolute -z-10 -right-12 sm:-right-24 bottom-0 w-60 sm:w-80 h-60 sm:h-80 bg-gradient-to-r from-orange-300/30 to-red-200/30 dark:from-orange-800/20 dark:to-red-700/20 rounded-full filter blur-3xl opacity-30 dark:opacity-20 animate-pulse-slower delay-1000"></div>
          
          {/* Content container */}
          <div className="relative z-10 p-6 sm:p-8">
            {/* Warning Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.15, 
                duration: 0.4, 
                ease: [0.22, 1, 0.36, 1]
              }}
              className="flex justify-center mb-4 sm:mb-6"
            >
              <div className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1.5 bg-gradient-to-r from-amber-50/80 to-orange-100/80 dark:from-slate-700/80 dark:to-slate-600/80 backdrop-blur-sm text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-medium rounded-full border border-amber-200/80 dark:border-slate-500/80 shadow-sm">
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-2" />
                <span className="mr-1.5 sm:mr-2">Mobile Detected</span>
                <span className="opacity-70 text-amber-400 dark:text-slate-500">•</span>
                <span className="ml-1.5 sm:ml-2">Desktop Required</span>
              </div>
            </motion.div>
            
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.25, 
                duration: 0.4, 
                ease: [0.22, 1, 0.36, 1]
              }}
              className="text-center mb-6"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl leading-tight font-bold text-gray-900 dark:text-slate-100 tracking-tight mb-3">
                Hey! Noticed you're on the go
              </h2>
              
              <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                MailMop was built to be used on computers because it runs locally in your browser for maximum privacy and performance.
              </p>
            </motion.div>

            {/* Why desktop explanation */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.35, 
                duration: 0.4, 
                ease: [0.22, 1, 0.36, 1]
              }}
              className="mb-6 text-center"
            >
              <div className="bg-amber-50/50 dark:bg-slate-700/40 backdrop-blur-[1px] border border-amber-100/80 dark:border-slate-600/80 rounded-xl p-4 max-w-md mx-auto">
                <h3 className="text-gray-900 dark:text-slate-100 text-sm sm:text-base font-semibold mb-3">
                  Why desktop works better:
                </h3>
                <ul className="text-gray-700 dark:text-slate-300 text-xs sm:text-sm text-left space-y-1.5">
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-2 mt-0.5">•</span>
                    <span>Processes large inboxes efficiently (50k+ emails)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-2 mt-0.5">•</span>
                    <span>Better interface for managing bulk operations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-2 mt-0.5">•</span>
                    <span>More stable for long-running analysis tasks</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-2 mt-0.5">•</span>
                    <span>Optimized keyboard shortcuts and workflows</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.45, 
                duration: 0.4, 
                ease: [0.22, 1, 0.36, 1]
              }}
              className="text-center"
            >
              <p className="text-gray-600 dark:text-slate-400 text-xs sm:text-sm mb-3">
                Please switch to a desktop or laptop to continue
              </p>
              
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                This page will automatically unlock when you're on a compatible device
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* CSS Animations - scoped to this component */}
      <style jsx>{`
        .animate-shimmer {
          background-size: 400% 400%;
          animation: shimmer 4s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .dot-pulse {
          animation: dotPulse 2.5s ease-in-out infinite;
        }

        @keyframes dotPulse {
          0%, 20%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          40%, 60% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-pulse-slower {
          animation: pulse-slower 6s ease-in-out infinite;
        }

        @keyframes pulse-slower {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  )
} 