'use client'

import { useAnalysis } from '@/context/AnalysisProvider'
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ReanalyzeButton() {
  const { hasAnalysis, isAnalyzing, checkAnalysisState } = useAnalysis()
  const { progress } = useAnalysisOperations()
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [showButton, setShowButton] = useState(false)

  // Debounce the button visibility to prevent flashing during transitions
  useEffect(() => {
    // Set base conditions for button visibility
    const shouldBeVisible = hasAnalysis && 
      !isAnalyzing && 
      !isReanalyzing &&
      ['completed', 'error', 'idle'].includes(progress.status)
    
    if (!shouldBeVisible) {
      // Hide immediately when conditions aren't met
      setShowButton(false)
    } else {
      // Add a small delay before showing to prevent flashing
      const timer = setTimeout(() => {
        setShowButton(true)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [hasAnalysis, isAnalyzing, isReanalyzing, progress.status])

  // Check for analysis state changes when progress changes
  useEffect(() => {
    // Immediately check analysis state when progress changes
    if (progress.status === 'completed' || progress.status === 'error') {
      console.log('[ReanalyzeButton] Analysis completed or errored, checking state...')
      checkAnalysisState()
      
      // Reset reanalyzing state
      setIsReanalyzing(false)
      
      // Double-check after a delay to ensure all state is updated
      setTimeout(() => {
        checkAnalysisState()
      }, 200)
    }
    
    // Hide button immediately when analysis is preparing or analyzing
    if (progress.status === 'preparing' || progress.status === 'analyzing') {
      setShowButton(false)
    }
  }, [progress.status, checkAnalysisState])

  // Handle reanalyze events
  useEffect(() => {
    const handleReanalyzeRequest = () => {
      console.log('[ReanalyzeButton] Reanalyze requested')
      setIsReanalyzing(true)
      setShowButton(false)
    }
    
    const handleReanalyzeCancel = () => {
      console.log('[ReanalyzeButton] Reanalyze cancelled')
      setIsReanalyzing(false)
    }

    const handleAnalysisStatusChange = () => {
      console.log('[ReanalyzeButton] Analysis status changed')
      // Always check analysis state on status change
      checkAnalysisState()
    }

    window.addEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest)
    window.addEventListener('mailmop:reanalyze-cancelled', handleReanalyzeCancel)
    window.addEventListener('mailmop:analysis-status-change', handleAnalysisStatusChange)
    
    return () => {
      window.removeEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest)
      window.removeEventListener('mailmop:reanalyze-cancelled', handleReanalyzeCancel)
      window.removeEventListener('mailmop:analysis-status-change', handleAnalysisStatusChange)
    }
  }, [checkAnalysisState])
  
  // Log state changes for debugging
  useEffect(() => {
    console.log(`[ReanalyzeButton] State: hasAnalysis=${hasAnalysis}, isAnalyzing=${isAnalyzing}, progress=${progress.status}, reanalyzing=${isReanalyzing}, showButton=${showButton}`)
  }, [hasAnalysis, isAnalyzing, progress.status, isReanalyzing, showButton])

  const handleReanalyze = () => {
    console.log('[ReanalyzeButton] Triggering reanalyze event')
    window.dispatchEvent(new Event('mailmop:reanalyze-requested'))
  }

  if (!showButton) return null

  return (
    <Button
      onClick={handleReanalyze}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-4 rounded-sm shadow-sm transition-colors"
      size="lg"
    >
      <RefreshCw className="mr-0 h-5 w-5" />
      Reanalyze Inbox
    </Button>
  )
} 