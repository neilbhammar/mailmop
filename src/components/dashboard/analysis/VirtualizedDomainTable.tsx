import React, { useMemo, useRef, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronRight, MinusSquare, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { RowActions } from './RowActions'
import { TableSender } from '@/hooks/useSenderData'
import { TruncatedCell, SenderNameCell, LastEmailCell } from './SenderTable'
import { useSenderActionMeta } from '@/hooks/useSenderActionMeta'

// Constants
const ROW_HEIGHT = 56
const OVERSCAN_COUNT = 5
const MAX_SELECTED_ROWS = 25

const COLUMN_WIDTHS = {
  checkbox: 'w-[3%]',
  name: 'w-[20%]',
  email: 'w-[30%]',
  lastEmail: 'w-[13%]',
  count: 'w-[10%]',
  actions: 'w-[24%]'
} as const

// Utility functions
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return `${Math.floor(diffInDays / 365)} years ago`
}

interface VirtualizedDomainTableProps {
  flattenedData: Array<{
    type: 'domain' | 'sender'
    data: any
  }>
  domainAggregations: Map<string, any>
  selectedEmails: Set<string>
  setSelectedEmails: (emails: Set<string>) => void
  toggleDomainExpansion: (domain: string) => void
  toggleEmailSelection: (email: string, selected: boolean) => void
  clearSelections: () => void
  showUnreadOnly: boolean
  isLoading: boolean
  isAnalyzing: boolean
  // Action handlers
  onBlockSingleSender: (email: string) => void
  onApplyLabelSingle?: (email: string) => void
  onDeleteSingleSender?: (email: string, count?: number) => void
  onDeleteWithExceptions?: (email: string, count?: number) => void
  onUnsubscribeSingleSender?: (email: string, isReUnsubscribe?: boolean) => void
  onMarkSingleSenderRead?: (email: string, unreadCount?: number) => void
  viewSenderInGmail: (email: string) => void
  handleDropdownOpen: (email: string) => void
  // Sorting
  domainSort: {
    field: 'domain' | 'senderCount' | 'lastEmail' | 'count'
    direction: 'asc' | 'desc'
  }
  handleDomainSortChange: (field: 'domain' | 'senderCount' | 'lastEmail' | 'count') => void
  // Selection management for auto deselection
  onSelectedCountChange?: {
    (count: number): void;
    removeFromSelection?: (emails: string[]) => void;
    clearSelections?: () => void;
    getSelectedEmails?: (emails: string[], emailCounts?: Record<string, number>) => void;
  }
}

export function VirtualizedDomainTable({
  flattenedData,
  domainAggregations,
  selectedEmails,
  setSelectedEmails,
  toggleDomainExpansion,
  toggleEmailSelection,
  clearSelections,
  showUnreadOnly,
  isLoading,
  isAnalyzing,
  onBlockSingleSender,
  onApplyLabelSingle,
  onDeleteSingleSender,
  onDeleteWithExceptions,
  onUnsubscribeSingleSender,
  onMarkSingleSenderRead,
  viewSenderInGmail,
  handleDropdownOpen,
  domainSort,
  handleDomainSortChange,
  onSelectedCountChange,
}: VirtualizedDomainTableProps) {
  const tableBodyRef = useRef<HTMLDivElement>(null)
  
  // Track the last selected email for shift+click functionality (only for senders, not domains)
  const lastSelectedRef = useRef<string | null>(null)
  
  // Store the intended action (select or deselect) for shift+click operations
  const lastSelectionActionRef = useRef<boolean>(true)

  // Update parent component when selection count changes (for auto deselection support)
  useEffect(() => {
    if (onSelectedCountChange) {
      onSelectedCountChange(selectedEmails.size);
    }
  }, [selectedEmails.size, onSelectedCountChange]);

  // Provide selected emails to parent component
  useEffect(() => {
    if (onSelectedCountChange && typeof onSelectedCountChange.getSelectedEmails === 'function') {
      // Create a map of email counts for selected emails
      const emailCountMap: Record<string, number> = {};
      
      // Get sender data for selected emails
      selectedEmails.forEach(email => {
        // Find sender in flattened data
        const senderItem = flattenedData.find(item => 
          item.type === 'sender' && item.data.email === email
        );
        if (senderItem) {
          emailCountMap[email] = senderItem.data.count;
        }
      });
      
      onSelectedCountChange.getSelectedEmails(Array.from(selectedEmails), emailCountMap);
    }
  }, [selectedEmails, onSelectedCountChange, flattenedData]);

  // Set up virtualizer
  const { getVirtualItems, getTotalSize } = useVirtualizer({
    count: flattenedData.length,
    getScrollElement: () => tableBodyRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_COUNT,
  })

  /**
   * Select or deselect a range of sender emails (for shift+click)
   * @param startEmail - The first email in the range
   * @param endEmail - The last email in the range
   * @param isSelecting - Whether to select or deselect the range
   */
  const selectEmailRange = useCallback((startEmail: string, endEmail: string, isSelecting: boolean) => {
    // Get only sender rows from flattened data
    const senderRows = flattenedData.filter(item => item.type === 'sender').map(item => item.data)
    
    // Find indices in the sender rows
    const startIndex = senderRows.findIndex((sender: TableSender) => sender.email === startEmail)
    const endIndex = senderRows.findIndex((sender: TableSender) => sender.email === endEmail)
    
    if (startIndex === -1 || endIndex === -1) return
    
    const min = Math.min(startIndex, endIndex)
    const max = Math.max(startIndex, endIndex)
    
    // Calculate how many new rows would be selected
    let potentialNewSelections = 0;
    if (isSelecting) {
      for (let i = min; i <= max; i++) {
        if (!selectedEmails.has(senderRows[i].email)) {
          potentialNewSelections++;
        }
      }
      
      // Check if we would exceed the limit
      if (selectedEmails.size + potentialNewSelections > MAX_SELECTED_ROWS) {
        toast.warning(`You can select a maximum of ${MAX_SELECTED_ROWS} rows at once.`);
        return;
      }
    }
    
    const newSet = new Set(selectedEmails)
    for (let i = min; i <= max; i++) {
      const email = senderRows[i].email
      if (isSelecting) {
        // Double-check again before adding to prevent exceeding MAX_SELECTED_ROWS
        if (newSet.size < MAX_SELECTED_ROWS || newSet.has(email)) {
          newSet.add(email)
        } else {
          // If we've reached the limit, stop adding more
          toast.warning(`Selection limited to ${MAX_SELECTED_ROWS} rows.`);
          break;
        }
      } else {
        newSet.delete(email)
      }
    }
    setSelectedEmails(newSet)
  }, [flattenedData, selectedEmails, setSelectedEmails])

  /**
   * Enhanced toggle email selection with shift-click support
   */
  const handleToggleEmailSelection = useCallback((email: string, isSelected: boolean, isShiftClick: boolean = false) => {
    // Handle shift+click for range selection
    if (isShiftClick && lastSelectedRef.current) {
      // Determine action based on the clicked row's current state
      const actionIsSelect = isSelected
      
      selectEmailRange(lastSelectedRef.current, email, actionIsSelect)
      
      // Update last action ref to match what we just did
      lastSelectionActionRef.current = actionIsSelect
      // Update the last selected email
      lastSelectedRef.current = email
      return
    }

    // Regular single selection
    toggleEmailSelection(email, isSelected)
    
    // Update last selected email for shift+click functionality
    lastSelectedRef.current = email
    // Store whether we were selecting or deselecting for shift+click
    lastSelectionActionRef.current = isSelected
  }, [toggleEmailSelection, selectEmailRange])

  if (isLoading && flattenedData.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        Loading senders...
      </div>
    )
  }

  if (flattenedData.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        {isAnalyzing ? 'Analyzing your inbox...' : 'No senders found'}
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col relative select-none">
      {/* Fixed Header */}
      <div className="border-t border-b border-slate-100 dark:border-slate-700/80 relative z-20 bg-white dark:bg-slate-800">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-white dark:bg-slate-800">
            <tr className="h-11">
              <th className={cn("px-4 py-4 font-semibold bg-white dark:bg-slate-800", COLUMN_WIDTHS.checkbox)}>
                <div className="flex items-center">
                  {selectedEmails.size > 0 && (
                    <button
                      onClick={() => clearSelections()}
                      className="text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400"
                    >
                      <MinusSquare className="h-5 w-5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </button>
                  )}
                </div>
              </th>
              <th className={cn("text-left px-4 py-4 font-semibold bg-white dark:bg-slate-800", COLUMN_WIDTHS.name)}>
                <button
                  onClick={() => handleDomainSortChange('domain')}
                  className="w-full text-left group"
                >
                  <span className="text-slate-600 font-normal group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                    Name
                  </span>
                </button>
              </th>
              <th className={cn("text-left px-4 py-4 font-semibold bg-white dark:bg-slate-800", COLUMN_WIDTHS.email)}>
                <button
                  onClick={() => handleDomainSortChange('senderCount')}
                  className="w-full text-left group"
                >
                  <span className="text-slate-600 font-normal group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                    Senders
                  </span>
                </button>
              </th>
              <th className={cn("text-left px-4 py-4 font-semibold bg-white dark:bg-slate-800", COLUMN_WIDTHS.lastEmail)}>
                <button
                  onClick={() => handleDomainSortChange('lastEmail')}
                  className="w-full text-left group"
                >
                  <span className="text-slate-600 font-normal group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                    Last Email
                  </span>
                </button>
              </th>
              <th className={cn("text-right px-4 py-4 font-semibold bg-white dark:bg-slate-800", COLUMN_WIDTHS.count)}>
                <button
                  onClick={() => handleDomainSortChange('count')}
                  className="w-full text-right group"
                >
                  <span className="inline-flex items-center gap-1 text-slate-600 font-normal group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                    {showUnreadOnly ? 'Unread' : 'Count'}
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  </span>
                </button>
              </th>
              <th className={cn("text-center px-4 py-4 font-semibold bg-white dark:bg-slate-800", COLUMN_WIDTHS.actions)}>
                
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Virtualized Table Body */}
      <div 
        ref={tableBodyRef}
        className="flex-1 overflow-auto relative z-10"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 transparent',
        }}
      >
        <div style={{ height: `${getTotalSize()}px`, position: 'relative' }}>
          {getVirtualItems().map(virtualRow => {
            const item = flattenedData[virtualRow.index]
            
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <table className="w-full text-sm table-fixed">
                  <tbody>
                    {item.type === 'domain' ? (
                      <DomainRow
                        domainData={item.data}
                        domainAggregations={domainAggregations}
                        selectedEmails={selectedEmails}
                        setSelectedEmails={setSelectedEmails}
                        toggleDomainExpansion={toggleDomainExpansion}
                        showUnreadOnly={showUnreadOnly}
                      />
                    ) : (
                      <SenderRow
                        sender={item.data}
                        selectedEmails={selectedEmails}
                        toggleEmailSelection={handleToggleEmailSelection}
                        showUnreadOnly={showUnreadOnly}
                        onBlockSingleSender={onBlockSingleSender}
                        onApplyLabelSingle={onApplyLabelSingle}
                        onDeleteSingleSender={onDeleteSingleSender}
                        onDeleteWithExceptions={onDeleteWithExceptions}
                        onUnsubscribeSingleSender={onUnsubscribeSingleSender}
                        onMarkSingleSenderRead={onMarkSingleSenderRead}
                        viewSenderInGmail={viewSenderInGmail}
                        handleDropdownOpen={handleDropdownOpen}
                      />
                    )}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Domain row component
function DomainRow({
  domainData,
  domainAggregations,
  selectedEmails,
  setSelectedEmails,
  toggleDomainExpansion,
  showUnreadOnly,
}: {
  domainData: any
  domainAggregations: Map<string, any>
  selectedEmails: Set<string>
  setSelectedEmails: (emails: Set<string>) => void
  toggleDomainExpansion: (domain: string) => void
  showUnreadOnly: boolean
}) {
  const countValue = showUnreadOnly ? domainData.totalUnreadCount : domainData.totalCount
  const domainAgg = domainAggregations.get(domainData.domain)
  const domainSenders = domainAgg?.senders || []
  const senderCount = domainData.senderCount ?? domainSenders.length
  const isDomainChecked = domainSenders.length > 0 && domainSenders.every((s: TableSender) => selectedEmails.has(s.email))
  const isDomainIndeterminate = domainSenders.some((s: TableSender) => selectedEmails.has(s.email)) && !isDomainChecked

  return (
    <tr 
      className="bg-slate-100/80 dark:bg-slate-800/80 border-b-2 border-slate-300 dark:border-slate-600 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 h-14 cursor-pointer"
      onClick={() => toggleDomainExpansion(domainData.domain)}
    >
      <td className={cn("px-4", COLUMN_WIDTHS.checkbox)}>
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={isDomainChecked}
            // @ts-ignore
            indeterminate={isDomainIndeterminate}
            onCheckedChange={(checked) => {
              const domainEmails = domainSenders.map((s: TableSender) => s.email)
              if (checked) {
                const newEmails = domainEmails.filter((e: string) => !selectedEmails.has(e))
                const availableSlots = MAX_SELECTED_ROWS - selectedEmails.size
                
                if (newEmails.length <= availableSlots) {
                  // Can select all senders in this domain
                  const newSet = new Set(selectedEmails)
                  newEmails.forEach((e: string) => newSet.add(e))
                  setSelectedEmails(newSet)
                } else if (availableSlots > 0) {
                  // Can only select some senders - take the first N
                  const newSet = new Set(selectedEmails)
                  const emailsToAdd = newEmails.slice(0, availableSlots)
                  emailsToAdd.forEach((e: string) => newSet.add(e))
                  setSelectedEmails(newSet)
                  toast.warning(`Domain has ${domainEmails.length} senders, but only ${availableSlots} could be selected due to the ${MAX_SELECTED_ROWS} row limit.`)
                } else {
                  // No available slots
                  toast.warning(`You can select a maximum of ${MAX_SELECTED_ROWS} rows at once.`)
                }
              } else {
                const newSet = new Set(selectedEmails)
                domainEmails.forEach((e: string) => newSet.delete(e))
                setSelectedEmails(newSet)
              }
            }}
          />
        </div>
      </td>
      <td className={cn("px-4 font-semibold text-slate-900 dark:text-slate-50", COLUMN_WIDTHS.name)}>
        <div className="flex items-center gap-2">
          <span>{domainData.domain}</span>
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {domainData.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" />
            )}
          </div>
        </div>
      </td>
      <td className={cn("px-4 text-slate-600 dark:text-slate-300 text-sm font-medium", COLUMN_WIDTHS.email)}>
        {senderCount} sender{senderCount !== 1 ? 's' : ''}
      </td>
      <td className={cn("px-4 text-slate-600 dark:text-slate-300 text-sm", COLUMN_WIDTHS.lastEmail)}>
        {formatRelativeTime(domainData.lastEmail)}
      </td>
      <td className={cn("px-4 text-right text-blue-700 dark:text-blue-400 font-medium", COLUMN_WIDTHS.count)}>
        {countValue.toLocaleString()}
      </td>
      <td className={cn("px-4", COLUMN_WIDTHS.actions)}>
        {/* Empty actions column for domain rows */}
      </td>
    </tr>
  )
}

// Sender row component
function SenderRow({
  sender,
  selectedEmails,
  toggleEmailSelection,
  showUnreadOnly,
  onBlockSingleSender,
  onApplyLabelSingle,
  onDeleteSingleSender,
  onDeleteWithExceptions,
  onUnsubscribeSingleSender,
  onMarkSingleSenderRead,
  viewSenderInGmail,
  handleDropdownOpen,
}: {
  sender: TableSender
  selectedEmails: Set<string>
  toggleEmailSelection: (email: string, selected: boolean, isShiftClick?: boolean) => void
  showUnreadOnly: boolean
  onBlockSingleSender: (email: string) => void
  onApplyLabelSingle?: (email: string) => void
  onDeleteSingleSender?: (email: string, count?: number) => void
  onDeleteWithExceptions?: (email: string, count?: number) => void
  onUnsubscribeSingleSender?: (email: string, isReUnsubscribe?: boolean) => void
  onMarkSingleSenderRead?: (email: string, unreadCount?: number) => void
  viewSenderInGmail: (email: string) => void
  handleDropdownOpen: (email: string) => void
}) {
  const isSelected = selectedEmails.has(sender.email)
  const senderCountValue = showUnreadOnly ? sender.unread_count : sender.count
  
  // Determine if any action is queued for this sender (matches SenderTable behavior)
  const { queued, isTrashed } = useSenderActionMeta(sender.email)

  return (
    <tr 
      className={cn(
        "h-14 border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-blue-50/40 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group bg-white dark:bg-slate-800",
        isSelected && 'bg-blue-50/75 dark:bg-slate-700/50',
        queued && "bg-amber-100/40 dark:bg-amber-700/10"
      )}
      onClick={(e) => {
        // Ignore clicks on action buttons
        if ((e.target as HTMLElement).closest('.actions-container')) return
        toggleEmailSelection(sender.email, !isSelected, e.shiftKey)
      }}
    >
      <td className={cn("px-4", COLUMN_WIDTHS.checkbox)}>
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={isSelected}
            onCheckedChange={(checked) => toggleEmailSelection(sender.email, Boolean(checked))}
          />
        </div>
      </td>
      <td className={cn("px-4 truncate", COLUMN_WIDTHS.name)}>
        <SenderNameCell 
          name={sender.name} 
          allNames={sender.allNames}
          hasMultipleNames={sender.hasMultipleNames}
          className="dark:text-slate-200" 
          strikethrough={sender.count === 0 || isTrashed}
        />
      </td>
      <td className={cn("px-4 truncate", COLUMN_WIDTHS.email)}>
        <TruncatedCell 
          content={sender.email} 
          className="text-slate-800 opacity-80 dark:text-slate-300 dark:opacity-70"
          strikethrough={sender.count === 0 || isTrashed}
        />
      </td>
      <td className={cn("px-4", COLUMN_WIDTHS.lastEmail)}>
        <LastEmailCell date={sender.lastEmail} strikethrough={sender.count === 0 || isTrashed} />
      </td>
      <td className={cn("px-4 text-right", COLUMN_WIDTHS.count)}>
        <span className="text-blue-700 dark:text-blue-400">
          {senderCountValue.toLocaleString()}
        </span>
      </td>
      <td className={cn("px-4 actions-container", COLUMN_WIDTHS.actions)}>
        <RowActions
          onBlock={onBlockSingleSender}
          onApplyLabel={onApplyLabelSingle || (() => {})}
          onDelete={onDeleteSingleSender || (() => {})}
          onDeleteWithExceptions={onDeleteWithExceptions || (() => {})}
          onUnsubscribe={onUnsubscribeSingleSender || (() => {})}
          onReUnsubscribe={onUnsubscribeSingleSender ? (email) => onUnsubscribeSingleSender(email, true) : undefined}
          onMarkUnread={onMarkSingleSenderRead || (() => {})}
          onViewInGmail={viewSenderInGmail}
          sender={sender}
          onDropdownOpen={handleDropdownOpen}
        />
      </td>
    </tr>
  )
} 