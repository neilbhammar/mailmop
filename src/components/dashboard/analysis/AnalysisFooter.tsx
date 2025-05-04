"use client"

import { useSenderData } from '@/hooks/useSenderData'
import { useMemo } from 'react'

interface AnalysisFooterProps {
  searchTerm?: string
  showUnreadOnly?: boolean
}

export function AnalysisFooter({ searchTerm = '', showUnreadOnly = false }: AnalysisFooterProps) {
  const { senders, isLoading, isAnalyzing } = useSenderData()

  // Filter senders based on search term and unread status
  const filteredCount = useMemo(() => {
    let filtered = senders;
    
    // First apply unread filter if enabled
    if (showUnreadOnly) {
      filtered = filtered.filter(sender => sender.unread_count > 0);
    }
    
    // Then apply search term filter
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      const terms = lowercaseSearch.split(' ').filter(Boolean);
      
      if (terms.length > 0) {
        filtered = filtered.filter(sender => {
          const nameLower = sender.name.toLowerCase();
          const emailLower = sender.email.toLowerCase();
          
          return terms.every(term => 
            nameLower.includes(term) || emailLower.includes(term)
          );
        });
      }
    }
    
    return filtered.length;
  }, [senders, searchTerm, showUnreadOnly]);

  // Handle different states with appropriate messages
  const getMessage = () => {
    if (isLoading) return "Loading senders..."
    if (searchTerm || showUnreadOnly) {
      const filterType = showUnreadOnly ? (searchTerm ? 'filtered' : 'unread') : 'matching';
      return `Showing ${filteredCount.toLocaleString()} ${filterType} of ${senders.length.toLocaleString()} senders`;
    }
    return `Showing ${senders.length.toLocaleString()} senders`
  }

  return (
    <div className="text-sm text-slate-500 bg-slate-50 px-4 py-3 rounded shrink-0">
      {getMessage()}
    </div>
  )
} 