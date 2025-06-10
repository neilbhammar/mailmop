'use client'

import { LockClosedIcon } from '@radix-ui/react-icons'
import { MessageSquareLock, RefreshCwOff } from 'lucide-react'

export default function LandingPrivacy() {
  const gridSize = 20; // Define grid size for easier modification

  return (
    <section id="privacy" className="py-12 md:py-16 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 dark:from-blue-800 dark:via-blue-700 dark:to-indigo-800 relative overflow-hidden p-10 shadow-2xl">
          {/* Pulsing Dot Grid Background */}
          <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none">
            <div className="absolute inset-0 w-full h-full grid" style={{gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)`}}>
              {Array(gridSize * gridSize).fill(0).map((_, index) => {
                const rowIndex = Math.floor(index / gridSize);
                const colIndex = index % gridSize;
                return (
                  <div 
                    key={`dot-${rowIndex}-${colIndex}`}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <div 
                      className="dot-pulse bg-white rounded-full dark:bg-white/70"
                      style={{
                        width: '3px',
                        height: '3px',
                        animationDelay: `${(rowIndex * 0.1 + colIndex * 0.07).toFixed(2)}s`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Floating mail icons (kept from original design) */}
          <div className="absolute top-10 right-10 text-white/10 animate-float-slow opacity-50 dark:text-slate-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="absolute bottom-10 left-10 text-white/10 animate-float-delayed-more opacity-50 dark:text-slate-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm p-3 rounded-full mb-6 border border-white/20 dark:bg-slate-700/30 dark:border-slate-500/40">
                <LockClosedIcon className="h-8 w-8 text-white dark:text-slate-200" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 dark:text-slate-100">Built for Privacy</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-4xl dark:text-blue-300">
                I built MailMop to be privacy-first. I didn't want my (or your) sensitive email data being stored on sketchy servers or sold to advertisers. With MailMop, your emails never leave your browser.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 shadow-lg hover:shadow-blue-500/30 dark:bg-slate-700/20 dark:border-slate-600/30 dark:hover:bg-slate-700/40 dark:shadow-blue-800/30">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4 border border-white/20 dark:bg-slate-600/30 dark:border-slate-500/40">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 dark:text-slate-100">Client-Side Processing</h3>
                <p className="text-blue-200 text-sm dark:text-blue-300">
                  All processing and storage happens in your browser, never on our servers.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 shadow-lg hover:shadow-blue-500/30 dark:bg-slate-700/20 dark:border-slate-600/30 dark:hover:bg-slate-700/40 dark:shadow-blue-800/30">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4 border border-white/20 dark:bg-slate-600/30 dark:border-slate-500/40">
                  <MessageSquareLock className="h-6 w-6 text-white dark:text-slate-200" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 dark:text-slate-100">Metadata Based</h3>
                <p className="text-blue-200 text-sm dark:text-blue-300">
                  MailMop only uses email headers to run its analysis. Body content is used upon request to enrich unsubscribe links.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 shadow-lg hover:shadow-blue-500/30 dark:bg-slate-700/20 dark:border-slate-600/30 dark:hover:bg-slate-700/40 dark:shadow-blue-800/30">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4 border border-white/20 dark:bg-slate-600/30 dark:border-slate-500/40">
                  <RefreshCwOff className="h-6 w-6 text-white dark:text-slate-200" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 dark:text-slate-100">Revoke Anytime</h3>
                <p className="text-blue-200 text-sm dark:text-blue-300">
                  You can disconnect MailMop from your Google account with a single click.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes pulseDotAnimation {
          0%, 100% {
            transform: scale(0.5);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
        .dot-pulse {
          animation: pulseDotAnimation 3s infinite ease-in-out;
        }
      `}</style>
    </section>
  )
} 