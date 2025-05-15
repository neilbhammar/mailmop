'use client'

import { ArrowRightIcon } from '@radix-ui/react-icons'

interface LandingCtaProps {
  signIn: () => Promise<void>;
}

export default function LandingCta({ signIn }: LandingCtaProps) {
  const gridSize = 20; // Define grid size for easier modification

  return (
    <section className="py-16 md:py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 relative overflow-hidden p-12 shadow-xl dark:shadow-blue-900/50">
          {/* Mail-themed decorative elements (existing) */}
          <div className="absolute -z-10 -right-20 -top-10 w-72 h-72 bg-blue-500/20 dark:bg-blue-400/10 rounded-full filter blur-3xl opacity-80 dark:opacity-60 animate-pulse-slow"></div>
          <div className="absolute -z-10 -left-20 -bottom-10 w-72 h-72 bg-indigo-500/20 dark:bg-indigo-400/10 rounded-full filter blur-3xl opacity-80 dark:opacity-60 animate-pulse-slower"></div>
          
          {/* Floating envelopes (existing - slightly adjusted opacity/stroke for better blend) */}
          <div className="absolute top-1/4 right-10 text-white/5 animate-float-delayed opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M3 19h18M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
            </svg>
          </div>
          <div className="absolute bottom-1/4 left-10 text-white/5 animate-float-slow opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          {/* Pulsing Dot Grid Background */}
          <div className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none">
            <div className="absolute inset-0 w-full h-full grid" style={{gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)`}}>
              {Array(gridSize * gridSize).fill(0).map((_, index) => {
                const rowIndex = Math.floor(index / gridSize);
                const colIndex = index % gridSize;
                return (
                  <div 
                    key={`cta-dot-${rowIndex}-${colIndex}`}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <div 
                      className="dot-pulse bg-white rounded-full"
                      style={{
                        width: '3px',
                        height: '3px',
                        animationDelay: `${(rowIndex * 0.12 + colIndex * 0.08).toFixed(2)}s`, // Slightly different timing for variety
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white dark:text-white mb-4">Ready to clean up your inbox?</h2>
            <p className="text-xl text-blue-100 dark:text-blue-200 mb-8 max-w-2xl mx-auto">
              Take control of your Gmail and reclaim your focus. Free to get started.
            </p>
            <button 
              onClick={signIn} 
              className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-md hover:bg-blue-50 dark:bg-slate-50 dark:text-blue-600 dark:hover:bg-slate-200 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 group flex items-center mx-auto"
            >
              Join the Waitlist
              <ArrowRightIcon className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes pulseDotAnimation {
          0%, 100% {
            transform: scale(0.5);
            opacity: 0.3; /* Base opacity for light mode */
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7; /* Base opacity for light mode */
          }
        }
        .dot-pulse {
          animation: pulseDotAnimation 3.5s infinite ease-in-out; // Slightly slower animation
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 5s infinite ease-in-out;
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }
        .animate-pulse-slower {
          animation: pulse-slower 6s infinite ease-in-out .5s; /* Added delay */
        }
      `}</style>
    </section>
  )
} 