'use client'

import { useState, useEffect } from 'react'
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import Step1_ConnectGmail from './Step1_ConnectGmail'
import Step2_RunAnalysis from './Step2_RunAnalysis'
import { storeDummyAnalysis } from '@/lib/gmail/tokenStorage'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

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
    <div className="flex flex-col w-full h-full bg-white">
      {/* Refined header with step indicator */}
      <div className="h-16 flex items-center justify-center border-b border-gray-100 relative">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute left-4 flex items-center text-slate-500 hover:text-slate-600 transition-colors py-2"
            aria-label={isReanalysis ? "Back to sender analysis" : "Back"}
          >
            <ArrowLeft size={16} className="mr-1.5" />
            <span className="text-sm font-medium">
              {isReanalysis ? "Back to sender analysis" : "Back"}
            </span>
          </button>
        )}
        
        {/* Step indicator */}
        <div className="flex items-center space-x-0">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && (
                <div className="h-0.5 w-12 bg-gray-200 relative overflow-hidden mx-2">
                  <div className={cn(
                    "h-full absolute inset-0 transition-all duration-500 ease-in-out",
                    step > i ? "w-full bg-blue-600" : "w-0 bg-blue-600"
                  )} />
                </div>
              )}
              <div 
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  step > i 
                    ? "bg-blue-600 text-white" 
                    : step === i + 1
                      ? "bg-blue-600 text-white ring-4 ring-blue-100" 
                      : "bg-gray-200 text-gray-500"
                )}
              >
                {i + 1}
              </div>
            </div>
          ))}
        </div>
        
        <div className="absolute right-4 text-sm font-medium text-gray-500">
          Step {step} of {totalSteps}
        </div>
      </div>

      {/* Content area with refined animation */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ 
              opacity: 0,
              x: animationDirection === 1 ? 20 : -20
            }}
            animate={{ 
              opacity: 1,
              x: 0
            }}
            exit={{ 
              opacity: 0,
              x: animationDirection === 1 ? -20 : 20
            }}
            transition={{ 
              duration: 0.3, 
              ease: "easeInOut" 
            }}
            className="h-full"
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
    </div>
  )
}