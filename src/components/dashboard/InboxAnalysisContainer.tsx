'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { useAnalysis } from '@/context/AnalysisProvider'
import IntroStepper from './analysisintro/IntroStepper'
import AnalysisTable from './analysis/AnalysisView'

export default function InboxAnalysisContainer() {
  // Get state from analysis context
  const { hasAnalysis, checkAnalysisState } = useAnalysis()
  
  // Local state for tracking reanalysis requests
  const [reanalyzeRequested, setReanalyzeRequested] = useState(false)

  // Show stepper if reanalyzing or no analysis data yet
  const showingStepper = reanalyzeRequested || !hasAnalysis

  // Check analysis state on mount and window focus
  useEffect(() => {
    // Initial check
    checkAnalysisState();

    // Handle window focus
    const handleFocus = () => {
      console.log('[InboxAnalysis] Window focused, checking analysis state');
      checkAnalysisState();
    };

    // Handle reanalyze requests
    const handleReanalyzeRequest = () => {
      console.log('[InboxAnalysis] Reanalyze requested');
      setReanalyzeRequested(true);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest);
    };
  }, [checkAnalysisState]);

  // Handle canceling reanalysis
  const handleCancel = () => {
    setReanalyzeRequested(false)
    // Dispatch cancel event for other components
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
      ) : (
        <AnalysisTable />
      )}
    </Card>
  )
}