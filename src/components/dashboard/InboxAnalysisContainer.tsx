'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { useAnalysis } from '@/context/AnalysisProvider'
import IntroStepper from './analysisintro/IntroStepper'
import AnalysisTable from './analysis/AnalysisView'
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'
import { useQueue } from '@/hooks/useQueue'

export default function InboxAnalysisContainer() {
  // Get important information about the analysis state:
  // - hasAnalysis: tells us if we already have analyzed emails
  // - isAnalyzing: tells us if we're currently analyzing emails
  const { hasAnalysis, isAnalyzing } = useAnalysis()
  
  // Get progress information about the current analysis operation
  const { progress } = useAnalysisOperations()
  
  // Get queue information to check if analysis is queued
  const { jobs } = useQueue()
  
  // Create a special variable to track if the user wants to analyze their inbox again
  // useState(false) means it starts as false
  const [reanalyzeRequested, setReanalyzeRequested] = useState(false)

  // Check if there's an analysis job in the queue (queued or running)
  const hasAnalysisInQueue = jobs.some(job => 
    job.type === 'analysis' && 
    (job.status === 'queued' || job.status === 'running')
  )

  // Simplified logic - show stepper only if:
  // 1. No existing analysis data AND
  // 2. User hasn't explicitly requested reanalysis AND  
  // 3. No analysis job is queued/running
  const showingStepper = (!hasAnalysis && !hasAnalysisInQueue) || reanalyzeRequested

  // Figure out if we should show the analysis results table
  // We show it when:
  // 1. We have analysis results OR
  // 2. We're currently analyzing OR
  // 3. We're getting ready to analyze or in the middle of it OR
  // 4. Analysis job is queued/running (prevents flicker)
  const showingAnalysisTable = hasAnalysis || 
    isAnalyzing || 
    hasAnalysisInQueue ||
    ['preparing', 'analyzing'].includes(progress.status)

  // Debug logging to understand state transitions
  useEffect(() => {
    console.log('[InboxAnalysisContainer] State check:', {
      hasAnalysis,
      isAnalyzing,
      hasAnalysisInQueue,
      reanalyzeRequested,
      progressStatus: progress.status,
      showingStepper,
      showingAnalysisTable
    });
  }, [hasAnalysis, isAnalyzing, hasAnalysisInQueue, reanalyzeRequested, progress.status, showingStepper, showingAnalysisTable]);

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
    <Card className="!rounded-lg !border !border-slate-200 dark:!border-slate-700 !p-0 h-[calc(100vh-17rem)] w-full max-w-7xl mx-auto bg-white dark:bg-slate-800 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all duration-300">
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