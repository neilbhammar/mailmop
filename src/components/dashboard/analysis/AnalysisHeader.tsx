"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnalysisTooltip } from "./AnalysisTooltip"
import { BulkActionsBar } from "./BulkActionsBar"
import { useSenderData } from '@/hooks/useSenderData'
import { useExport } from '@/hooks/useExport'
import { useState, useCallback, useMemo } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { MoreHorizontal, Download, Mail } from 'lucide-react'
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AnalysisHeaderProps {
  selectedCount?: number
  onViewInGmail?: () => void
  onDelete?: () => void
  isDeleteDisabled?: boolean
  onMarkAllAsRead?: () => void
  onDeleteWithExceptions?: () => void
  onApplyLabel?: () => void
  onBlockSenders?: () => void
  onSearchChange?: (search: string) => void
  onToggleUnreadOnly?: (enabled: boolean) => void
}

export function AnalysisHeader({
  selectedCount = 0,
  onViewInGmail = () => console.log('View in Gmail bulk action'),
  onDelete = () => console.log('Delete bulk action'),
  isDeleteDisabled = false,
  onMarkAllAsRead = () => console.log('Mark all as read bulk action'),
  onDeleteWithExceptions = () => console.log('Delete with exceptions bulk action'),
  onApplyLabel = () => console.log('Apply label bulk action'),
  onBlockSenders = () => console.log('Block senders bulk action'),
  onSearchChange = () => console.log('Search changed'),
  onToggleUnreadOnly = () => console.log('Toggle unread only')
}: AnalysisHeaderProps) {
  const hasSelection = selectedCount > 0;
  const { senders, isLoading, isAnalyzing } = useSenderData();
  const { exportToCSV, isExporting, error } = useExport();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Calculate total emails from all senders
  const getTotals = useMemo(() => {
    // First filter by unread if enabled
    let filteredSenders = senders;
    if (showUnreadOnly) {
      filteredSenders = senders.filter(sender => sender.unread_count > 0);
    }

    // Then apply search filter if present
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      const terms = lowercaseSearch.split(' ').filter(Boolean);
      
      if (terms.length > 0) {
        filteredSenders = filteredSenders.filter(sender => {
          const nameLower = sender.name.toLowerCase();
          const emailLower = sender.email.toLowerCase();
          
          return terms.every(term => 
            nameLower.includes(term) || emailLower.includes(term)
          );
        });
      }
    }

    return {
      emails: showUnreadOnly 
        ? filteredSenders.reduce((sum, sender) => sum + sender.unread_count, 0)
        : filteredSenders.reduce((sum, sender) => sum + sender.count, 0),
      senderCount: filteredSenders.length,
      totalEmails: senders.reduce((sum, sender) => sum + sender.count, 0),
      totalSenders: senders.length
    };
  }, [senders, searchTerm, showUnreadOnly]);

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

  // Handle search input changes - no sanitization needed for client-side search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearchChange(value);
  };

  // Handle unread only toggle
  const handleUnreadOnlyToggle = () => {
    const newValue = !showUnreadOnly;
    setShowUnreadOnly(newValue);
    onToggleUnreadOnly(newValue);
  };

  return (
    <div className="px-4 pt-4 pb-4 flex flex-col gap-3 shrink-0">
      {/* Header and bulk actions row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold dark:text-slate-100">Sender Analysis</h1>
          
          {hasSelection && (
            <BulkActionsBar
              selectedCount={selectedCount}
              onViewInGmail={onViewInGmail}
              onDelete={onDelete}
              isDeleteDisabled={isDeleteDisabled}
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input 
              placeholder="Search senders..." 
              className="w-[240px] h-9 text-sm bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-slate-100 dark:focus-visible:ring-slate-600 dark:text-slate-200 pl-9"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-9 w-9 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[260px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-slate-900/50 py-2">
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70"
                onSelect={(event) => {
                  event.preventDefault();
                  handleUnreadOnlyToggle();
                }}
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">Unread Senders Only</span>
                </div>
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-md",
                  showUnreadOnly 
                    ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300" 
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {showUnreadOnly ? 'On' : 'Off'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-2 cursor-pointer px-3 py-2 text-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70"
                onSelect={() => exportToCSV(senders)}
                disabled={isExporting || senders.length === 0}
              >
                <Download className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
                <span className="text-sm">
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Analysis info row - always present */}
      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <AnalysisTooltip />
        <span className="pb-[2px]">| {getStatusMessage()}</span>
      </div>
    </div>
  )
} 