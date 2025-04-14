'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { useAnalysis } from '@/context/AnalysisProvider'
import IntroStepper from './analysisintro/IntroStepper'
import AnalysisTable from './analysis/AnalysisView'
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'

export default function InboxAnalysisContainer() {
  // Get state from analysis context and operations
  const { hasAnalysis, isAnalyzing } = useAnalysis()
  const { progress } = useAnalysisOperations()
  
  // Local state for tracking reanalysis requests
  const [reanalyzeRequested, setReanalyzeRequested] = useState(false)

  // Show stepper ONLY when:
  // 1. Explicitly requested reanalysis OR
  // 2. No analysis exists AND not analyzing AND in idle state
  const showingStepper = reanalyzeRequested || 
    (!hasAnalysis && !isAnalyzing && progress.status === 'idle')

  // Show analysis table when:
  // 1. Analysis exists OR
  // 2. Currently analyzing OR
  // 3. Analysis operation is active (preparing/analyzing)
  const showingAnalysisTable = hasAnalysis || 
    isAnalyzing || 
    ['preparing', 'analyzing'].includes(progress.status)

  // Effect to handle analysis completion
  useEffect(() => {
    if (progress.status === 'completed' || progress.status === 'error') {
      setReanalyzeRequested(false)
    }
  }, [progress.status])

  // Handle reanalyze requests
  useEffect(() => {
    const handleReanalyzeRequest = () => {
      console.log('[InboxAnalysis] Reanalyze requested')
      setReanalyzeRequested(true)
    }

    const handleReanalyzeCancel = () => {
      console.log('[InboxAnalysis] Reanalyze cancelled')
      setReanalyzeRequested(false)
    }

    window.addEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest)
    window.addEventListener('mailmop:reanalyze-cancelled', handleReanalyzeCancel)
    
    return () => {
      window.removeEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest)
      window.removeEventListener('mailmop:reanalyze-cancelled', handleReanalyzeCancel)
    }
  }, [])

  // Handle canceling reanalysis
  const handleCancel = () => {
    setReanalyzeRequested(false)
    window.dispatchEvent(new Event('mailmop:reanalyze-cancelled'))
  }

  return (
    <Card className="!rounded-lg !border !border-slate-200 !p-0 h-[calc(100vh-17rem)] w-full max-w-7xl mx-auto bg-white overflow-hidden !shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-300">
      {showingStepper ? (
        <IntroStepper 
          onComplete={() => setReanalyzeRequested(false)}
          onCancel={hasAnalysis ? handleCancel : undefined}
          isReanalysis={hasAnalysis}
        />
      ) : showingAnalysisTable ? (
        <AnalysisTable />
      ) : null}
    </Card>
  )
}