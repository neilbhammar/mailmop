'use client'

import { useState, useEffect } from 'react'
import { X, Shield, ChevronRight } from 'lucide-react'
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import Step1_ConnectGmail from './Step1_ConnectGmail'
import Step2_RunAnalysis from './Step2_RunAnalysis'
import { storeDummyAnalysis } from '@/lib/gmail/tokenStorage'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface IntroStepperProps {
  onComplete: () => void;
  onCancel?: () => void;
  isReanalysis?: boolean;
}

export default function IntroStepper({ 
  onComplete, 
  onCancel, 
  isReanalysis = false 
}: IntroStepperProps) {
  const [step, setStep] = useState(1)
  const [animationDirection, setAnimationDirection] = useState(0) // 0 for initial, 1 for forward
  const { isTokenValid } = useGmailPermissions()
  
  // Always start at step 1 if we don't have a valid token
  // The isReanalysis flag only controls the cancel button visibility
  useEffect(() => {
    if (isTokenValid) {
      setStep(2)
      setAnimationDirection(1)
    } else {
      setStep(1)
    }
  }, [isTokenValid])

  const goToNextStep = () => {
    setAnimationDirection(1)
    setStep(2)
  }

  const handleComplete = () => {
    // Store dummy analysis data first
    storeDummyAnalysis()
    // Then trigger the view switch
    onComplete()
  }

  const totalSteps = 2
  
  return (
    <div className="relative flex flex-col min-h-[500px] w-full max-w-3xl mx-auto rounded-2xl bg-gradient-to-b from-white to-blue-50/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100/60 overflow-hidden">
      {/* Glass header with progress indicator */}
      <div className="sticky top-0 z-10 backdrop-blur-sm bg-white/80 border-b border-blue-100/50 p-5 shadow-sm">
        <div className="mx-auto max-w-xl relative">
          {/* Pill-shaped progress bar */}
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden w-full max-w-[240px] mx-auto">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          
          {/* Step circles on top of progress bar */}
          <div className="absolute top-0 left-0 w-full flex justify-between px-1 -translate-y-[3px]">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                  step > i 
                    ? "bg-blue-500 text-white transform scale-100" 
                    : "bg-white border-2 border-gray-200 text-gray-400 transform scale-75"
                )}
              >
                {step > i ? (
                  <span className="text-xs font-medium">✓</span>
                ) : (
                  <span className="text-xs font-medium">{i + 1}</span>
                )}
              </div>
            ))}
          </div>
          
          {/* Step labels under progress bar */}
          <div className="flex justify-between mt-5 text-xs text-gray-500 font-medium max-w-[240px] mx-auto px-1">
            <span className={step >= 1 ? "text-blue-600" : ""}>Connect</span>
            <span className={step >= 2 ? "text-blue-600" : ""}>Analyze</span>
          </div>
        </div>
      </div>
      
      {/* Close button - always show it, but styled differently for reanalysis */}
      <button 
        onClick={onCancel}
        className={cn(
          "absolute top-4 right-4 z-20 p-2 rounded-full transition-all",
          isReanalysis 
            ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80" 
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/80"
        )}
        aria-label={isReanalysis ? "Cancel reanalysis" : "Close"}
      >
        <X size={20} />
      </button>
      
      {/* Security badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full py-1 px-3 border border-emerald-100">
        <Shield size={12} className="text-emerald-600" />
        <span>Secure Connection</span>
      </div>

      {/* Content area with animation */}
      <div className="flex-grow p-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: animationDirection * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full"
          >
            {step === 1 && (
              <Step1_ConnectGmail onNext={goToNextStep} />
            )}
            
            {step === 2 && (
              <Step2_RunAnalysis onStart={handleComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Privacy footer */}
      <div className="bg-white/90 border-t border-blue-50 p-4 text-center text-xs text-gray-500">
        <p>Your data never leaves your browser. <a href="#" className="text-blue-500 hover:text-blue-700 hover:underline inline-flex items-center">Learn more <ChevronRight size={12} /></a></p>
      </div>
    </div>
  )
}