"use client"

import { useSenderData } from '@/hooks/useSenderData'

export function AnalysisFooter() {
  const { senders, isLoading, isAnalyzing } = useSenderData()

  // Handle different states with appropriate messages
  const getMessage = () => {
    if (isLoading) return "Loading senders..."
    return `Showing ${senders.length.toLocaleString()} senders`
  }

  return (
    <div className="text-sm text-slate-500 bg-slate-50 px-4 py-3 rounded shrink-0">
      {getMessage()}
    </div>
  )
} 