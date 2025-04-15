"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnalysisTooltip } from "./AnalysisTooltip"
import { BulkActionsBar } from "./BulkActionsBar"

interface AnalysisHeaderProps {
  selectedCount?: number
  onViewInGmail?: () => void
  onDelete?: () => void
  onMarkAllAsRead?: () => void
  onDeleteWithExceptions?: () => void
  onApplyLabel?: () => void
  onBlockSenders?: () => void
}

export function AnalysisHeader({
  selectedCount = 0,
  onViewInGmail = () => console.log('View in Gmail bulk action'),
  onDelete = () => console.log('Delete bulk action'),
  onMarkAllAsRead = () => console.log('Mark all as read bulk action'),
  onDeleteWithExceptions = () => console.log('Delete with exceptions bulk action'),
  onApplyLabel = () => console.log('Apply label bulk action'),
  onBlockSenders = () => console.log('Block senders bulk action')
}: AnalysisHeaderProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="px-4 pt-4 pb-4 flex flex-col gap-3 shrink-0">
      {/* Header and bulk actions row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold">Email Senders</h1>
          
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
            />
          </div>
          <Button 
            variant="outline" 
            className="h-9 px-4 text-sm font-normal border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Analysis info row - always present */}
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <AnalysisTooltip />
        <span className="pb-[1px]">| 0 emails from 563 senders</span>
      </div>
    </div>
  )
} 