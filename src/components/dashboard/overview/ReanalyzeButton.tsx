'use client'

import { useAnalysis } from '@/context/AnalysisProvider'
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

export default function ReanalyzeButton() {
  const { hasAnalysis, isAnalyzing, checkAnalysisState } = useAnalysis()
  const { progress } = useAnalysisOperations()
  const [isVisible, setIsVisible] = useState(false)

  // Simple effect to determine button visibility based on core conditions
  useEffect(() => {
    // Check if analysis data exists but we're not currently analyzing
    const shouldBeVisible = hasAnalysis && !isAnalyzing
    
    logger.debug('Visibility check', {
      component: 'ReanalyzeButton',
      hasAnalysis,
      isAnalyzing,
      shouldBeVisible
    });
    
    // Set visibility immediately (no delay)
    setIsVisible(shouldBeVisible)
  }, [hasAnalysis, isAnalyzing])

  // Force check analysis state when the component mounts
  useEffect(() => {
    logger.debug('Component mounted, checking analysis state', {
      component: 'ReanalyzeButton'
    });
    checkAnalysisState()
  }, [checkAnalysisState])

  // Always listen for analysis status changes to update visibility
  useEffect(() => {
    const handleAnalysisStatusChange = () => {
      logger.debug('Analysis status changed, checking state', {
        component: 'ReanalyzeButton'
      });
      checkAnalysisState()
    }

    // Listen for analysis status change events
    window.addEventListener('mailmop:analysis-status-change', handleAnalysisStatusChange)
    
    return () => {
      window.removeEventListener('mailmop:analysis-status-change', handleAnalysisStatusChange)
    }
  }, [checkAnalysisState])

  const handleReanalyze = () => {
    logger.debug('Triggering reanalyze event', { component: 'ReanalyzeButton' });
    window.dispatchEvent(new Event('mailmop:reanalyze-requested'))
  }

  // Debug logging
  useEffect(() => {
    logger.debug('Render state', {
      component: 'ReanalyzeButton',
      hasAnalysis,
      isAnalyzing,
      isVisible,
      progressStatus: progress.status
    });
  }, [hasAnalysis, isAnalyzing, isVisible, progress.status])

  if (!isVisible) return null

  return (
    <Button
      onClick={handleReanalyze}
      className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white font-medium px-6 py-4 rounded-sm shadow-sm transition-colors"
      size="lg"
    >
      <RefreshCw className="mr-0 h-5 w-5" />
      Reanalyze Inbox
    </Button>
  )
} 