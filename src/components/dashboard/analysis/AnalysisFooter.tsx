"use client"

import { useSenderData } from '@/hooks/useSenderData'
import { useMemo } from 'react'

interface AnalysisFooterProps {
  searchTerm?: string
  showUnreadOnly?: boolean
  showHasUnsubscribe?: boolean
}

export function AnalysisFooter({ searchTerm = '', showUnreadOnly = false, showHasUnsubscribe = false }: AnalysisFooterProps) {
  const { senders, isLoading, isAnalyzing } = useSenderData()

  // Filter senders based on search term, unread status, and unsubscribe availability
  const filteredCount = useMemo(() => {
    let filtered = senders;
    
    // First apply unread filter if enabled
    if (showUnreadOnly) {
      filtered = filtered.filter(sender => sender.unread_count > 0);
    }
    
    // Then apply unsubscribe filter if enabled (AND operation)
    if (showHasUnsubscribe) {
      filtered = filtered.filter(sender => sender.hasUnsubscribe);
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
  }, [senders, searchTerm, showUnreadOnly, showHasUnsubscribe]);

  // Handle different states with appropriate messages
  const getMessage = () => {
    if (isLoading) return "Loading senders..."
    if (searchTerm || showUnreadOnly || showHasUnsubscribe) {
      let filterType = 'filtered';
      if (!searchTerm) {
        if (showUnreadOnly && showHasUnsubscribe) {
          filterType = 'unread with unsubscribe';
        } else if (showUnreadOnly) {
          filterType = 'unread';
        } else if (showHasUnsubscribe) {
          filterType = 'with unsubscribe';
        }
      }
      return `Showing ${filteredCount.toLocaleString()} ${filterType} of ${senders.length.toLocaleString()} senders`;
    }
    return `Showing ${senders.length.toLocaleString()} senders`
  }

  return (
    <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 rounded shrink-0">
      {getMessage()}
    </div>
  )
} 