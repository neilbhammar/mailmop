'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { useAnalysis } from '@/context/AnalysisProvider'
import IntroStepper from './analysisintro/IntroStepper'
import AnalysisTable from './analysis/AnalysisView'
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'

export default function InboxAnalysisContainer() {
  // Get important information about the analysis state:
  // - hasAnalysis: tells us if we already have analyzed emails
  // - isAnalyzing: tells us if we're currently analyzing emails
  const { hasAnalysis, isAnalyzing } = useAnalysis()
  
  // Get progress information about the current analysis operation
  const { progress } = useAnalysisOperations()
  
  // Create a special variable to track if the user wants to analyze their inbox again
  // useState(false) means it starts as false
  const [reanalyzeRequested, setReanalyzeRequested] = useState(false)

  // Simplified logic - show stepper only if:
  // 1. No existing analysis data OR
  // 2. User explicitly requested reanalysis
  const showingStepper = !hasAnalysis || reanalyzeRequested

  // Figure out if we should show the analysis results table
  // We show it when:
  // 1. We have analysis results OR
  // 2. We're currently analyzing OR
  // 3. We're getting ready to analyze or in the middle of it
  const showingAnalysisTable = hasAnalysis || 
    isAnalyzing || 
    ['preparing', 'analyzing'].includes(progress.status)

  // This effect watches for when analysis completes or fails
  // When either happens, we reset the reanalyze request
  useEffect(() => {
    if (progress.status === 'completed' || progress.status === 'error') {
      setReanalyzeRequested(false)
    }
  }, [progress.status])

  // Single cancel handler that both updates state and notifies the app
  const handleCancel = () => {
    setReanalyzeRequested(false)
    // Still dispatch event for any other components that might need to know
    window.dispatchEvent(new Event('mailmop:reanalyze-cancelled'))
  }

  // Only need one event listener
  useEffect(() => {
    const handleReanalyzeRequest = () => {
      console.log('[InboxAnalysis] Reanalyze requested')
      setReanalyzeRequested(true)
    }

    window.addEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest)
    
    return () => {
      window.removeEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest)
    }
  }, [])

  // Finally, render our component inside a nice card container
  // The card is styled to be a specific size and look pretty
  return (
    <Card className="!rounded-lg !border !border-slate-200 !p-0 h-[calc(100vh-17rem)] w-full max-w-7xl mx-auto bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-300">
      {/* Show either the step-by-step guide OR the analysis table based on our conditions above */}
      {showingStepper ? (
        <IntroStepper 
          isReanalysis={hasAnalysis}
          onCancel={hasAnalysis ? handleCancel : undefined}
          onComplete={() => setReanalyzeRequested(false)}
        />
      ) : showingAnalysisTable ? (
        <AnalysisTable />  // Show the table with analysis results
      ) : null}
    </Card>
  )
}