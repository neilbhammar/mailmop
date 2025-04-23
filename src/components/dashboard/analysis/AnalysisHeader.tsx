"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnalysisTooltip } from "./AnalysisTooltip"
import { BulkActionsBar } from "./BulkActionsBar"
import { useSenderData } from '@/hooks/useSenderData'
import { useExport } from '@/hooks/useExport'
import { useState, useCallback, useMemo } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface AnalysisHeaderProps {
  selectedCount?: number
  onViewInGmail?: () => void
  onDelete?: () => void
  onMarkAllAsRead?: () => void
  onDeleteWithExceptions?: () => void
  onApplyLabel?: () => void
  onBlockSenders?: () => void
  onSearchChange?: (search: string) => void
}

export function AnalysisHeader({
  selectedCount = 0,
  onViewInGmail = () => console.log('View in Gmail bulk action'),
  onDelete = () => console.log('Delete bulk action'),
  onMarkAllAsRead = () => console.log('Mark all as read bulk action'),
  onDeleteWithExceptions = () => console.log('Delete with exceptions bulk action'),
  onApplyLabel = () => console.log('Apply label bulk action'),
  onBlockSenders = () => console.log('Block senders bulk action'),
  onSearchChange = () => console.log('Search changed')
}: AnalysisHeaderProps) {
  const hasSelection = selectedCount > 0;
  const { senders, isLoading, isAnalyzing } = useSenderData();
  const { exportToCSV, isExporting, error } = useExport();
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate total emails from all senders
  const getTotals = useMemo(() => {
    if (!searchTerm) {
      return {
        emails: senders.reduce((sum, sender) => sum + sender.count, 0),
        senderCount: senders.length
      };
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const terms = lowercaseSearch.split(' ').filter(Boolean);
    
    if (terms.length === 0) {
      return {
        emails: senders.reduce((sum, sender) => sum + sender.count, 0),
        senderCount: senders.length
      };
    }

    const filteredSenders = senders.filter(sender => {
      const nameLower = sender.name.toLowerCase();
      const emailLower = sender.email.toLowerCase();
      
      return terms.every(term => 
        nameLower.includes(term) || emailLower.includes(term)
      );
    });

    return {
      emails: filteredSenders.reduce((sum, sender) => sum + sender.count, 0),
      senderCount: filteredSenders.length,
      totalEmails: senders.reduce((sum, sender) => sum + sender.count, 0),
      totalSenders: senders.length
    };
  }, [senders, searchTerm]);

  // Get the status message
  const getStatusMessage = () => {
    if (isLoading) return "Loading..."
    return `${getTotals.emails.toLocaleString()} emails from ${getTotals.senderCount.toLocaleString()} senders`;
  }

  // Debounce the search callback to prevent too many updates
  const debouncedSearchChange = useDebouncedCallback(
    (value: string) => {
      onSearchChange(value);
    },
    300 // 300ms delay
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    debouncedSearchChange(newSearchTerm);
  };

  return (
    <div className="px-4 pt-4 pb-4 flex flex-col gap-3 shrink-0">
      {/* Header and bulk actions row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold">Sender Analysis</h1>
          
          {hasSelection && (
            <BulkActionsBar
              selectedCount={selectedCount}
              onViewInGmail={onViewInGmail}
              onDelete={onDelete}
              onMarkAllAsRead={onMarkAllAsRead}
              onDeleteWithExceptions={onDeleteWithExceptions}
              onApplyLabel={onApplyLabel}
              onBlockSenders={onBlockSenders}
            />
          )}
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input 
              placeholder="Search senders..." 
              className="w-[240px] h-9 text-sm bg-white border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-100 pl-9"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <Button 
            variant="outline" 
            className="h-9 px-4 text-sm font-normal border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-600"
            onClick={() => exportToCSV(senders)}
            disabled={isExporting || senders.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Analysis info row - always present */}
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <AnalysisTooltip />
        <span className="pb-[2px]">| {getStatusMessage()}</span>
      </div>
    </div>
  )
} 