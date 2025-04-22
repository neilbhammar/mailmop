"use client"

import { useSenderData } from '@/hooks/useSenderData'
import { useMemo } from 'react'

interface AnalysisFooterProps {
  searchTerm?: string
}

export function AnalysisFooter({ searchTerm = '' }: AnalysisFooterProps) {
  const { senders, isLoading, isAnalyzing } = useSenderData()

  // Filter senders based on search term
  const filteredCount = useMemo(() => {
    if (!searchTerm) return senders.length;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    const terms = lowercaseSearch.split(' ').filter(Boolean);
    
    if (terms.length === 0) return senders.length;
    
    return senders.filter(sender => {
      const nameLower = sender.name.toLowerCase();
      const emailLower = sender.email.toLowerCase();
      
      return terms.every(term => 
        nameLower.includes(term) || emailLower.includes(term)
      );
    }).length;
  }, [senders, searchTerm]);

  // Handle different states with appropriate messages
  const getMessage = () => {
    if (isLoading) return "Loading senders..."
    if (searchTerm) {
      return `Showing ${filteredCount.toLocaleString()} of ${senders.length.toLocaleString()} senders`;
    }
    return `Showing ${senders.length.toLocaleString()} senders`
  }

  return (
    <div className="text-sm text-slate-500 bg-slate-50 px-4 py-3 rounded shrink-0">
      {getMessage()}
    </div>
  )
} 