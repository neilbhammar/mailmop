'use client'

import { useAnalysis } from '@/context/AnalysisProvider'
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

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
      className={cn(
        "font-medium text-sm transition-colors",
        // Mobile: a quiet text action. The solid block competed with the page
        // title for attention on a screen where the sender table is the point.
        "bg-transparent shadow-none h-8 px-2 rounded-md",
        "text-blue-600 dark:text-blue-400",
        "hover:bg-blue-50 dark:hover:bg-blue-950/40",
        // Desktop: unchanged solid button.
        "sm:bg-blue-600 sm:hover:bg-blue-700 sm:text-white",
        "sm:dark:bg-blue-500 sm:dark:hover:bg-blue-600 sm:dark:text-white",
        "sm:h-10 sm:px-6 sm:py-4 sm:rounded-sm sm:shadow-sm"
      )}
      size="lg"
    >
      <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
      {/*
        Both words live in ONE span so they form a single flex item. Button is
        `inline-flex gap-2`, so a bare "Reanalyze" text node next to a separate
        <span> would be two flex items and pick up the 8px gap on top of the
        nbsp, rendering as a double space.
      */}
      <span>
        Reanalyze<span className="hidden sm:inline">&nbsp;Inbox</span>
      </span>
    </Button>
  )
} 