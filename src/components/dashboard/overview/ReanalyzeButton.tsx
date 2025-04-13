'use client'

import { useAnalysis } from '@/context/AnalysisProvider'
import { useAnalysisOperations } from '@/hooks/useAnalysisOperations'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ReanalyzeButton() {
  // Get state from analysis context
  const { hasAnalysis } = useAnalysis()
  const { progress } = useAnalysisOperations()
  
  // Track if reanalysis is in progress
  const [isReanalyzing, setIsReanalyzing] = useState(false)

  // Listen for both reanalyze requests and cancellations
  useEffect(() => {
    const handleReanalyzeRequest = () => {
      setIsReanalyzing(true)
    }

    const handleReanalyzeCancel = () => {
      setIsReanalyzing(false)
    }

    window.addEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest)
    window.addEventListener('mailmop:reanalyze-cancelled', handleReanalyzeCancel)
    
    return () => {
      window.removeEventListener('mailmop:reanalyze-requested', handleReanalyzeRequest)
      window.removeEventListener('mailmop:reanalyze-cancelled', handleReanalyzeCancel)
    }
  }, [])
  
  // Only show if:
  // 1. We have analysis data
  // 2. Analysis is either idle or completed
  // 3. Not currently reanalyzing
  const shouldShow = hasAnalysis && 
    (progress.status === 'idle' || progress.status === 'completed') && 
    !isReanalyzing

  // Get reanalyze function from parent container
  const handleReanalyze = () => {
    // This will be handled by InboxAnalysisContainer through state updates
    const reanalyzeEvent = new Event('mailmop:reanalyze-requested')
    window.dispatchEvent(reanalyzeEvent)
  }

  if (!shouldShow) return null

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