'use client'

import { storeDummyAnalysis } from '@/lib/gmail/tokenStorage'
import { X } from 'lucide-react'

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
  const handleComplete = () => {
    // Store dummy analysis data first
    storeDummyAnalysis()
    // Then trigger the view switch
    onComplete()
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full space-y-4">
      {isReanalysis && onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700"
          aria-label="Cancel reanalysis"
        >
          <X size={20} />
        </button>
      )}

      <h2 className="text-2xl font-semibold text-gray-800">
        {isReanalysis ? 'Reanalyzing Your Inbox' : 'Welcome to MailMop'}
      </h2>
      <p className="text-gray-600">This will be our intro stepper flow</p>
      <button 
        onClick={handleComplete}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Simulate Complete
      </button>
    </div>
  )
}