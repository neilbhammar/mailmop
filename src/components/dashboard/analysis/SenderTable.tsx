"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  Row
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useState, useMemo, useEffect, useCallback, memo, useRef } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { MinusSquare, ArrowUpDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSenderData, TableSender } from '@/hooks/useSenderData'
import { RowActions } from "./RowActions"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AlertTriangle } from "lucide-react"
import styles from './SenderTable.module.css'
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime'
import { Portal } from "@radix-ui/react-portal"
import { useViewInGmail } from '@/hooks/useViewInGmail'
import { ApplyLabelModal } from '@/components/modals/ApplyLabelModal'

// Define column widths for consistent layout
const COLUMN_WIDTHS = {
  checkbox: "w-[3%]",
  name: "w-[20%]",
  email: "w-[30%]",
  lastEmail: "w-[13%]",
  count: "w-[10%]",
  actions: "w-[24%]"
} as const

// Maximum number of rows that can be selected at once
const MAX_SELECTED_ROWS = 25

// Fixed row height for virtualization (based on h-14 class: 3.5rem = 56px)
const ROW_HEIGHT = 56;

// How many rows to render beyond the visible area (overscan)
const OVERSCAN_COUNT = 100;

// Update the Sender type to use TableSender
export type Sender = TableSender;

/**
 * Memoized row component to prevent unnecessary re-renders
 * Only re-renders when selection state, active state, or row data changes
 */
const SenderRow = memo(({ 
  row, 
  isSelected, 
  isActive,
  onRowClick, 
  onRowMouseLeave,
  cells,
  columnWidths,
  showUnreadOnly
}: { 
  row: Row<Sender>
  isSelected: boolean
  isActive: boolean
  onRowClick: (e: React.MouseEvent, row: Row<Sender>) => void
  onRowMouseLeave: () => void
  cells: any[]
  columnWidths: typeof COLUMN_WIDTHS
  showUnreadOnly: boolean
}) => {
  return (
    <tr 
      key={row.original.email}
      className={cn(
        "relative h-14 cursor-pointer group transition-colors duration-75",
        "hover:bg-blue-50/75 dark:hover:bg-slate-700",
        (isSelected || isActive) && "bg-blue-50/75 dark:bg-slate-700/75"
      )}
      onClick={(e) => onRowClick(e, row)}
      onMouseLeave={onRowMouseLeave}
    >
      {cells.map(cell => {
        const width = columnWidths[cell.column.id as keyof typeof columnWidths]
        return (
          <td 
            key={cell.id} 
            className={cn(
              "px-4 border-b border-slate-200/80 dark:border-slate-700/80",
              width,
              cell.column.id === 'actions' && 'actions-container'
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
  )
}, (prevProps, nextProps) => {
  // Only re-render if selection, active state, row data, or showUnreadOnly changed
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.row.original.count === nextProps.row.original.count &&
    prevProps.row.original.lastEmail === nextProps.row.original.lastEmail &&
    prevProps.row.original.actionsTaken.length === nextProps.row.original.actionsTaken.length &&
    prevProps.showUnreadOnly === nextProps.showUnreadOnly
  )
})

/**
 * Memoized checkbox component to prevent unnecessary re-renders
 * Optimized for performance in tables with many rows
 */
const SelectCheckbox = memo(({ 
  checked, 
  onChange, 
  indeterminate = false 
}: { 
  checked: boolean
  onChange: (checked: boolean) => void
  indeterminate?: boolean
}) => {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onChange}
      aria-label="Select row"
      className="group-hover:border-slate-600 dark:group-hover:border-slate-400 transition-opacity duration-75"
    />
  )
}, (prev, next) => prev.checked === next.checked && prev.indeterminate === next.indeterminate)

interface SenderTableProps {
  /** Callback function when selected count changes */
  onSelectedCountChange: {
    (count: number): void;
    viewInGmail?: () => void;
    getSelectedEmails?: (emails: string[], emailCounts?: Record<string, number>) => void;
    applyLabelBulk?: () => void;
    clearSelections?: () => void;
    removeFromSelection?: (emails: string[]) => void;
  }
  /** Current search term for filtering senders */
  searchTerm?: string
  /** Whether to show only unread senders */
  showUnreadOnly?: boolean
  /** Whether to show only senders with unsubscribe options */
  showHasUnsubscribe?: boolean
  /** Callback for single sender delete action */
  onDeleteSingleSender?: (email: string, count?: number) => void
  /** Callback for delete with exceptions action */
  onDeleteWithExceptions?: (email: string, count?: number) => void
  /** Callback for marking a single sender as read */
  onMarkSingleSenderRead?: (email: string, unreadCount?: number) => void
  /** Callback for single sender apply label */
  onApplyLabelSingle?: (email: string) => void
  /** Callback for bulk apply label */
  onApplyLabelBulk?: (emails: string[]) => void
  /** Callback for blocking a single sender */
  onBlockSingleSender: (email: string) => void
  /** Callback for unsubscribing from a single sender */
  onUnsubscribeSingleSender?: (email: string, isReUnsubscribe?: boolean) => void
}

/**
 * Filter senders based on search term, unread status, and unsubscribe availability
 * Matches against name and email, case-insensitive
 * Applies AND logic when multiple filters are enabled
 * Memoized for performance
 */
const useFilteredSenders = (senders: Sender[], searchTerm: string, showUnreadOnly: boolean, showHasUnsubscribe: boolean) => {
  return useMemo(() => {
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
    
    return filtered;
  }, [senders, searchTerm, showUnreadOnly, showHasUnsubscribe]);
};

/**
 * SenderNameCell - Component for displaying sender names with multiple names support
 * Shows a small up arrow icon for senders with multiple names and displays all names in tooltip
 * When multiple names exist, hovering anywhere over the name area shows the "all names" tooltip
 */
const SenderNameCell = memo(({ 
  name,
  allNames,
  hasMultipleNames,
  className,
  strikethrough = false
}: { 
  name: string
  allNames?: string[]
  hasMultipleNames: boolean
  className?: string
  strikethrough?: boolean
}) => {
  if (!hasMultipleNames || !allNames || allNames.length === 0) {
    // No multiple names - use the standard truncated cell
    return (
      <TruncatedCell 
        content={name} 
        className={className} 
        strikethrough={strikethrough}
      />
    );
  }

  // Has multiple names - wrap entire name area with "all names" tooltip
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 w-full">
            {/* Use a simple div instead of TruncatedCell to avoid nested tooltips */}
            <div 
              className={cn(
                "truncate flex-1", 
                className,
                strikethrough && "line-through opacity-60"
              )}
            >
              {name}
            </div>
            <ChevronsUpDown className="h-3 w-3 text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex-shrink-0" />
          </div>
        </TooltipTrigger>
        <Portal container={document.getElementById('tooltip-root')}>
          <TooltipContent 
            side="top" 
            className="max-w-[300px] max-h-[200px] z-[100] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <div className="space-y-1">
              <div className="font-medium text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                All names used by this sender:
              </div>
              <div className="max-h-[140px] overflow-y-auto space-y-1">
                {/* Show current display name first */}
                <div className="text-sm font-medium">{name}</div>
                {/* Show other names */}
                {allNames.filter(n => n !== name).map((senderName, index) => (
                  <div key={index} className="text-sm text-slate-600 dark:text-slate-300">
                    {senderName}
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Portal>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * TruncatedCell - A reusable component for handling text truncation with tooltips
 * Only shows tooltip if content is actually truncated
 */
const TruncatedCell = memo(({ 
  content,
  className,
  strikethrough = false
}: { 
  content: string
  className?: string
  strikethrough?: boolean
}) => {
  const textRef = useRef<HTMLDivElement>(null)
  const [isTextTruncated, setIsTextTruncated] = useState(false)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Check if text is truncated on mount and resize
  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const isTruncated = textRef.current.scrollWidth > textRef.current.clientWidth
        if (isTruncated !== isTextTruncated) {
          setIsTextTruncated(isTruncated)
        }
      }
    }

    // Initial check
    checkTruncation()

    // Set up ResizeObserver
    if (textRef.current) {
      resizeObserverRef.current = new ResizeObserver(checkTruncation)
      resizeObserverRef.current.observe(textRef.current)
    }

    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [content, isTextTruncated]) // Only re-run if content changes or truncation state changes

  const innerContent = (
    <div 
      ref={textRef}
      className={cn(
        "truncate", 
        className,
        strikethrough && "line-through opacity-60"
      )}
    >
      {content}
    </div>
  )

  if (!isTextTruncated) {
    return innerContent
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {innerContent}
        </TooltipTrigger>
        <Portal container={document.getElementById('tooltip-root')}>
          <TooltipContent 
            side="top" 
            className="max-w-[300px] break-words z-[100] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            {content}
          </TooltipContent>
        </Portal>
      </Tooltip>
    </TooltipProvider>
  )
})

/**
 * Format a date string to "MMM D, YYYY" format (e.g. "Apr 3, 2025")
 */
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const LastEmailCell = memo(({ 
  date, 
  strikethrough = false 
}: { 
  date: string
  strikethrough?: boolean
}) => {
  const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(date));

  useEffect(() => {
    // Update relative time every minute
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(date));
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  return (
    <div className="truncate">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "text-slate-600 dark:text-slate-400 cursor-default",
              strikethrough && "line-through opacity-60"
            )}>
              {relativeTime}
            </span>
          </TooltipTrigger>
          <Portal container={document.getElementById('tooltip-root')}>
            <TooltipContent side="top" sideOffset={4} className="z-[100] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
              {new Date(date).toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }).replace(',', '')}
            </TooltipContent>
          </Portal>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}, (prev, next) => prev.date === next.date && prev.strikethrough === next.strikethrough);

/**
 * Wrapper for RowActions to ensure consistent layout and spacing
 */
const ActionWrapper = memo(({ 
  sender, 
  onDropdownOpen, 
  onDeleteSingleSender, 
  onDeleteWithExceptions,
  onMarkSingleSenderRead,
  onApplyLabelSingle,
  onBlockSingleSender,
  onUnsubscribeSingleSender
}: { 
  sender: Sender, 
  onDropdownOpen: (email: string) => void,
  onDeleteSingleSender?: (email: string, count?: number) => void,
  onDeleteWithExceptions?: (email: string, count?: number) => void,
  onMarkSingleSenderRead?: (email: string, unreadCount?: number) => void,
  onApplyLabelSingle?: (email: string) => void,
  onBlockSingleSender: (email: string) => void,
  onUnsubscribeSingleSender?: (email: string, isReUnsubscribe?: boolean) => void
}) => {
  const { viewSenderInGmail } = useViewInGmail();
  
  return (
    <div className="flex justify-end space-x-1">
      <RowActions
        sender={sender}
        onDropdownOpen={onDropdownOpen}
        onUnsubscribe={(email) => 
          onUnsubscribeSingleSender 
            ? onUnsubscribeSingleSender(email) 
            : console.warn('onUnsubscribeSingleSender not provided to ActionWrapper')
        }
        onReUnsubscribe={(email) => 
          onUnsubscribeSingleSender 
            ? onUnsubscribeSingleSender(email, true) // Pass true to indicate re-unsubscribe
            : console.warn('onUnsubscribeSingleSender not provided to ActionWrapper')
        }
        onViewInGmail={(email) => viewSenderInGmail(email)}
        onDelete={(email) => onDeleteSingleSender ? onDeleteSingleSender(email, sender.count) : console.log('Delete:', email)}
        onMarkUnread={(email) => onMarkSingleSenderRead ? onMarkSingleSenderRead(email, sender.unread_count) : console.log('Mark Unread:', email)}
        onDeleteWithExceptions={(email) => onDeleteWithExceptions ? onDeleteWithExceptions(email, sender.count) : console.log('Delete with Exceptions:', email)}
        onApplyLabel={(email) => onApplyLabelSingle ? onApplyLabelSingle(email) : console.log('Apply Label Single:', email)}
        onBlock={(email) => onBlockSingleSender(email)}
      />
    </div>
  );
});

/**
 * SenderTable - A high-performance table component for displaying email senders
 * Features:
 * - Fast selection using Set data structure for O(1) lookups
 * - Shift+click for range selection (both selecting and deselecting)
 * - Limited to MAX_SELECTED_ROWS selections for performance
 * - Optimized rendering with memoized components
 * - Sorting and row actions
 * - Virtualized rendering for handling large datasets
 */
export function SenderTable({
  onSelectedCountChange,
  searchTerm = '',
  showUnreadOnly = false,
  showHasUnsubscribe = false,
  onDeleteSingleSender,
  onDeleteWithExceptions,
  onMarkSingleSenderRead,
  onApplyLabelSingle,
  onBlockSingleSender,
  onUnsubscribeSingleSender
}: SenderTableProps) {
  const { senders: allSenders, isLoading, isAnalyzing } = useSenderData();
  const { viewSenderInGmail, viewMultipleSendersInGmail } = useViewInGmail();
  const senders = useFilteredSenders(allSenders, searchTerm, showUnreadOnly, showHasUnsubscribe);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'count', desc: true }
  ]);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  
  // Track selection state with a Set for O(1) lookups
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  
  // Track the last selected email for shift+click functionality
  const lastSelectedRef = useRef<string | null>(null);
  
  // Store the intended action (select or deselect) for shift+click operations
  const lastSelectionActionRef = useRef<boolean>(true);
  
  // Reference to the virtualized scrollable container
  const tableBodyRef = useRef<HTMLDivElement>(null);
  
  // Scroll position preservation
  const savedScrollPositionRef = useRef<number>(0);
  const isRestoringScrollRef = useRef<boolean>(false);
  
  // --- State for Apply Label Modal ---
  const [isApplyLabelModalOpen, setIsApplyLabelModalOpen] = useState(false);
  const [applyLabelModalData, setApplyLabelModalData] = useState<{ 
    senders: string[], 
    emailCount: number,
    emailCountMap: Record<string, number>
  }>({ 
    senders: [], 
    emailCount: 0,
    emailCountMap: {}
  });
  
  // Update parent component when selection count changes
  useEffect(() => {
    onSelectedCountChange(selectedEmails.size)
  }, [selectedEmails.size, onSelectedCountChange])
  
  // Convert our Set-based selection to the format required by the table library
  const rowSelection = useMemo(() => {
    const selection: Record<number, boolean> = {}
    senders.forEach((sender, index) => {
      if (selectedEmails.has(sender.email)) {
        selection[index] = true
      }
    })
    return selection
  }, [senders, selectedEmails])

  /**
   * Handle opening of dropdown menus in row actions
   * Sets the active row to highlight it while the dropdown is open
   */
  const handleDropdownOpen = useCallback((email: string) => {
    setActiveRowId(email)
  }, [])
  
  /**
   * Handle mouse leave event on rows
   * Clears the active row state if no dropdowns are open
   */
  const handleRowMouseLeave = useCallback(() => {
    if (!document.querySelector('[data-state="open"]')) {
      setActiveRowId(null)
    }
  }, [])

  /**
   * Toggle selection for a single email
   * @param email - The email to toggle
   * @param isSelected - Whether to select (true) or deselect (false)
   * @returns boolean - Whether the operation was successful (false if max limit reached)
   */
  const toggleEmailSelection = useCallback((email: string, isSelected: boolean): boolean => {
    let success = true;
    
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      
      // If we're trying to add and we'll exceed the limit, prevent it
      if (isSelected && !prev.has(email) && prev.size >= MAX_SELECTED_ROWS) {
        success = false;
        return prev; // Return unchanged set
      }
      
      // Otherwise proceed with the toggle
      if (isSelected) {
        newSet.add(email)
      } else {
        newSet.delete(email)
      }
      return newSet
    })
    
    // Update last selected email for shift+click functionality
    lastSelectedRef.current = email
    // Store whether we were selecting or deselecting for shift+click
    lastSelectionActionRef.current = isSelected
    
    return success;
  }, [setSelectedEmails])
  
  /**
   * Clear all selections
   */
  const clearSelections = useCallback(() => {
    setSelectedEmails(new Set())
    lastSelectedRef.current = null
  }, [])

  /**
   * Remove specific emails from selection
   */
  const removeFromSelection = useCallback((emailsToRemove: string[]) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      emailsToRemove.forEach(email => newSet.delete(email))
      return newSet
    })
  }, [])
  
  /**
   * Handle checkbox click events
   */
  const handleCheckboxChange = useCallback((row: Row<Sender>, checked: boolean) => {
    const success = toggleEmailSelection(row.original.email, checked)
    
    // Show warning if max limit reached
    if (!success) {
      toast.warning(`You can select a maximum of ${MAX_SELECTED_ROWS} rows at once.`);
    }
  }, [toggleEmailSelection])

  // Define table columns with memoization to prevent unnecessary recalculations
  const columns = useMemo<ColumnDef<Sender>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="h-4 w-4 flex items-center">
          {selectedEmails.size > 0 && (
            <button
              onClick={(e) => {
                clearSelections()
                e.stopPropagation()
              }}
              className="text-slate-400 hover:text-slate-500 -ml-0.5 -mt-0.5 dark:text-slate-500 dark:hover:text-slate-400"
            >
              <MinusSquare 
                className="h-5 w-5" 
                strokeWidth={1.5} 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </button>
          )}
        </div>
      ),
      cell: ({ row }) => {
        const isSelected = selectedEmails.has(row.original.email)
        return (
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <SelectCheckbox
              checked={isSelected}
              onChange={(checked) => handleCheckboxChange(row, checked)}
            />
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full text-left group"
        >
          <span className="text-slate-600 font-normal group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
            Name
          </span>
        </button>
      ),
      cell: ({ row }) => (
        <SenderNameCell 
          name={row.getValue("name")} 
          allNames={row.original.allNames}
          hasMultipleNames={row.original.hasMultipleNames}
          className="dark:text-slate-200" 
          strikethrough={row.original.count === 0}
        />
      )
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full text-left group"
        >
          <span className="text-slate-600 font-normal group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
            Email
          </span>
        </button>
      ),
      cell: ({ row }) => (
        <TruncatedCell 
          content={row.getValue("email")} 
          className="text-slate-800 opacity-80 dark:text-slate-300 dark:opacity-70"
          strikethrough={row.original.count === 0}
        />
      )
    },
    {
      accessorKey: "lastEmail",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full text-left group"
        >
          <span className="text-slate-600 font-normal group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
            Last Email
          </span>
        </button>
      ),
      cell: ({ row }) => (
        <LastEmailCell date={row.getValue("lastEmail")} strikethrough={row.original.count === 0} />
      ),
      sortingFn: (rowA, rowB) => {
        // Convert date strings to Date objects for proper comparison
        const a = new Date(rowA.getValue("lastEmail"))
        const b = new Date(rowB.getValue("lastEmail"))
        return a > b ? 1 : a < b ? -1 : 0
      }
    },
    {
      accessorKey: "count",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full text-right group"
        >
          <span className="inline-flex items-center gap-1 text-slate-600 font-normal group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
            {showUnreadOnly ? 'Unread' : 'Count'}
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          </span>
        </button>
      ),
      cell: ({ row }) => {
        const sender = row.original;
        const hasDeleteWithExceptions = sender.actionsTaken?.includes('delete_with_exceptions') || false;
        const countValue = showUnreadOnly ? sender.unread_count : (row.getValue("count") as number);
        
        return (
          <div className="truncate text-right pr-2">
            <span className="text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
              {hasDeleteWithExceptions && showUnreadOnly && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    </TooltipTrigger>
                    <Portal container={document.getElementById('tooltip-root')}>
                      <TooltipContent side="top" sideOffset={4} className="z-[100] max-w-xs">
                        <p>Estimate after partial deletion. May be inaccurate.</p>
                      </TooltipContent>
                    </Portal>
                  </Tooltip>
                </TooltipProvider>
              )}
              {countValue}
            </span>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = showUnreadOnly ? 
          Number(rowA.original.unread_count) : 
          Number(rowA.getValue("count"));
        const b = showUnreadOnly ? 
          Number(rowB.original.unread_count) : 
          Number(rowB.getValue("count"));
        return a > b ? 1 : a < b ? -1 : 0;
      }
    },
    {
      id: "actions",
      header: () => <div className="text-right text-slate-600 font-normal pr-1 dark:text-slate-300"></div>,
      cell: ({ row }) => (
        <RowActions
          onBlock={onBlockSingleSender}
          onApplyLabel={onApplyLabelSingle || (() => console.warn('onApplyLabelSingle not provided to SenderTable'))}
          onDelete={onDeleteSingleSender || (() => console.warn('onDeleteSingleSender not provided'))}
          onDeleteWithExceptions={onDeleteWithExceptions || (() => console.warn('onDeleteWithExceptions not provided'))}
          onUnsubscribe={onUnsubscribeSingleSender || (() => console.warn('onUnsubscribeSingleSender not provided'))}
          onReUnsubscribe={onUnsubscribeSingleSender ? (email) => onUnsubscribeSingleSender(email, true) : undefined}
          onMarkUnread={
            onMarkSingleSenderRead 
              ? (email) => onMarkSingleSenderRead(email) 
              : (() => console.warn('onMarkSingleSenderRead not provided'))
          }
          onViewInGmail={viewSenderInGmail || (() => console.warn('viewSenderInGmail not provided'))}
          sender={row.original}
          onDropdownOpen={(email) => handleDropdownOpen(email)}
        />
      ),
      enableSorting: false,
      enableHiding: false
    }
  ], [
    senders, 
    selectedEmails, 
    sorting, 
    clearSelections, 
    handleCheckboxChange, 
    onDeleteSingleSender, 
    onDeleteWithExceptions, 
    onMarkSingleSenderRead, 
    onBlockSingleSender, 
    onUnsubscribeSingleSender, 
    onApplyLabelSingle, 
    viewSenderInGmail,
    handleDropdownOpen,
    showUnreadOnly
  ]);

  // Initialize and configure the table
  const table = useReactTable({
    data: senders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection,
      sorting,
    },
    enableRowSelection: true,
    enableSorting: true,
    enableMultiSort: false,
    onSortingChange: setSorting,
    autoResetPageIndex: false,
  })
  
  /**
   * Select or deselect a range of emails (for shift+click)
   * @param startEmail - The first email in the range
   * @param endEmail - The last email in the range
   * @param isSelecting - Whether to select or deselect the range
   */
  const selectEmailRange = useCallback((startEmail: string, endEmail: string, isSelecting: boolean) => {
    // Get the current sorted rows from the table
    const sortedRows = table.getRowModel().rows
    
    // Find indices in the sorted rows
    const startIndex = sortedRows.findIndex(row => row.original.email === startEmail)
    const endIndex = sortedRows.findIndex(row => row.original.email === endEmail)
    
    if (startIndex === -1 || endIndex === -1) return
    
    const min = Math.min(startIndex, endIndex)
    const max = Math.max(startIndex, endIndex)
    
    // Calculate how many new rows would be selected
    let potentialNewSelections = 0;
    if (isSelecting) {
      for (let i = min; i <= max; i++) {
        if (!selectedEmails.has(sortedRows[i].original.email)) {
          potentialNewSelections++;
        }
      }
      
      // Check if we would exceed the limit
      if (selectedEmails.size + potentialNewSelections > MAX_SELECTED_ROWS) {
        toast.warning(`You can select a maximum of ${MAX_SELECTED_ROWS} rows at once.`);
        return;
      }
    }
    
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      for (let i = min; i <= max; i++) {
        const email = sortedRows[i].original.email
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
      return newSet
    })
  }, [table, selectedEmails])

  // Add a new effect to enforce the selection limit
  useEffect(() => {
    if (selectedEmails.size > MAX_SELECTED_ROWS) {
      toast.warning(`Selection limit is ${MAX_SELECTED_ROWS} rows. Some selections were discarded.`);
      
      // Trim down to the limit by removing excess items
      setSelectedEmails(prev => {
        const newSet = new Set<string>();
        let count = 0;
        
        // Only keep MAX_SELECTED_ROWS items
        for (const email of prev) {
          if (count < MAX_SELECTED_ROWS) {
            newSet.add(email);
            count++;
          } else {
            break;
          }
        }
        
        return newSet;
      });
    }
  }, [selectedEmails.size]);

  /**
   * Handle row click with support for shift+click range selection
   * Prevents selection when clicking on action buttons or checkboxes
   */
  const handleRowClick = useCallback((e: React.MouseEvent, row: Row<Sender>) => {
    // Ignore clicks on action buttons or checkboxes (they handle their own events)
    if (
      (e.target as HTMLElement).closest('.actions-container') ||
      (e.target as HTMLElement).closest('input[type="checkbox"]')
    ) {
      return
    }
    
    const email = row.original.email
    const isCurrentlySelected = selectedEmails.has(email)
    
    // Handle shift+click for range selection
    if (e.shiftKey && lastSelectedRef.current) {
      // Determine action based on the clicked row's current state
      // If we're clicking a selected row, deselect the range
      // If we're clicking an unselected row, select the range
      const actionIsSelect = !isCurrentlySelected
      
      selectEmailRange(lastSelectedRef.current, email, actionIsSelect)
      
      // Update last action ref to match what we just did
      lastSelectionActionRef.current = actionIsSelect
      // Update the last selected email
      lastSelectedRef.current = email
      return
    }
    
    // Toggle single selection
    const success = toggleEmailSelection(email, !isCurrentlySelected)
    
    // Show warning if max limit reached
    if (!success) {
      toast.warning(`You can select a maximum of ${MAX_SELECTED_ROWS} rows at once.`);
    }
    
    e.stopPropagation()
  }, [selectedEmails, toggleEmailSelection, selectEmailRange])

  // Set up the virtualizer with simplified configuration
  const { getVirtualItems, getTotalSize } = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableBodyRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_COUNT,
  });

  // Handle bulk View in Gmail action
  const handleBulkViewInGmail = useCallback(() => {
    if (selectedEmails.size === 0) {
      toast.warning('No senders selected');
      return;
    }
    
    const selectedEmailsArray = Array.from(selectedEmails);
    viewMultipleSendersInGmail(selectedEmailsArray);
  }, [selectedEmails, viewMultipleSendersInGmail]);

  // Make handleBulkViewInGmail available to parent components
  useEffect(() => {
    if (onSelectedCountChange) {
      // ✅ Fix: Proper type safety - interface already supports these methods
      onSelectedCountChange.viewInGmail = handleBulkViewInGmail;
      onSelectedCountChange.clearSelections = clearSelections;
      onSelectedCountChange.removeFromSelection = removeFromSelection;
      
      // Also provide the selected emails to the parent component
      if (typeof onSelectedCountChange.getSelectedEmails === 'function') {
        onSelectedCountChange.getSelectedEmails(Array.from(selectedEmails));
      }
    }
  }, [onSelectedCountChange, handleBulkViewInGmail, clearSelections, removeFromSelection, selectedEmails]);

  // This effect will update the selected emails whenever they change
  useEffect(() => {
    if (onSelectedCountChange && typeof onSelectedCountChange.getSelectedEmails === 'function') {
      // Create a map of email counts
      const emailCountMap: Record<string, number> = {};
      
      // Get the selected senders with their counts
      Array.from(selectedEmails).forEach(email => {
        const sender = senders.find(s => s.email === email);
        if (sender) {
          emailCountMap[email] = sender.count;
        }
      });
      
      // Pass both the email array and count map to the parent component
      onSelectedCountChange.getSelectedEmails(Array.from(selectedEmails), emailCountMap);
    }
  }, [selectedEmails, onSelectedCountChange, senders]);

  // --- Placeholder Handlers for Apply Label ---
  const handleOpenApplyLabelModal = useCallback((emails: string[], totalEmailCount: number) => {
    console.log("Opening Apply Label Modal for:", emails, "Total emails:", totalEmailCount);
    // Get email counts for the selected senders
    const emailCountMap: Record<string, number> = {};
    emails.forEach(email => {
      const sender = senders.find(s => s.email === email);
      if (sender) {
        emailCountMap[email] = sender.count;
      }
    });
    
    // TODO: Check Pro Plan status here before opening
    setApplyLabelModalData({ 
      senders: emails, 
      emailCount: totalEmailCount,
      emailCountMap
    });
    setIsApplyLabelModalOpen(true);
  }, [senders]);

  // Add callback for bulk apply label action
  useEffect(() => {
    if (onSelectedCountChange && typeof onSelectedCountChange.getSelectedEmails === 'function') {
      const selectedEmailsArray = Array.from(selectedEmails);
      const selectedSendersData = selectedEmailsArray
        .map(email => senders.find(s => s.email === email))
        .filter((s): s is Sender => !!s); // Ensure only valid senders are included
        
      const totalEmailCount = selectedSendersData.reduce((sum, sender) => sum + sender.count, 0);
      
      // ✅ Fix: Proper type safety - interface already supports this method
      onSelectedCountChange.applyLabelBulk = () => {
        if (selectedEmailsArray.length > 0) {
          handleOpenApplyLabelModal(selectedEmailsArray, totalEmailCount);
        }
      }
    }
  }, [selectedEmails, onSelectedCountChange, senders, handleOpenApplyLabelModal]);

  return (
    <>
      {/* Add a portal root for tooltips that will render outside table constraints */}
      <Portal>
        <div id="tooltip-root" className="fixed inset-0 pointer-events-none z-50" />
      </Portal>
      
      <div className="w-full h-full flex flex-col relative select-none">
        {/* Fixed Header - Add higher z-index */}
        <div className="border-t border-b border-slate-100 dark:border-slate-700/80 relative z-20 bg-white dark:bg-slate-800">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-white dark:bg-slate-800">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="h-11">
                  {headerGroup.headers.map(header => {
                    const width = COLUMN_WIDTHS[header.column.id as keyof typeof COLUMN_WIDTHS]
                    return (
                      <th 
                        key={header.id} 
                        className={cn(
                          "text-left px-4 py-4 font-semibold bg-white dark:bg-slate-800",
                          width,
                          "overflow-hidden"
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
          </table>
        </div>

        {/* Table Body - Add position context */}
        <div 
          ref={tableBodyRef}
          className={cn(
            "flex-1 overflow-auto relative z-10", 
            styles.scrollbarCustom
          )}
        >
          {/* Instead of using absolute positioning, we'll use a more traditional approach */}
          {isLoading && senders.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              Loading senders...
            </div>
          ) : senders.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {isAnalyzing ? 'Analyzing your inbox...' : 'No senders found'}
            </div>
          ) : (
            <div style={{ height: `${getTotalSize()}px`, position: 'relative' }}>
              {getVirtualItems().map(virtualRow => {
                const row = table.getRowModel().rows[virtualRow.index];
                return (
                  <div
                    key={row.original.email}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <table className="w-full text-sm table-fixed border-collapse">
                      <tbody>
                        <SenderRow
                          row={row}
                          isSelected={selectedEmails.has(row.original.email)}
                          isActive={activeRowId === row.original.email}
                          onRowClick={handleRowClick}
                          onRowMouseLeave={handleRowMouseLeave}
                          cells={row.getVisibleCells()}
                          columnWidths={COLUMN_WIDTHS}
                          showUnreadOnly={showUnreadOnly}
                        />
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Apply Label Modal */}
      <ApplyLabelModal
        open={isApplyLabelModalOpen}
        onOpenChange={setIsApplyLabelModalOpen}
        senderCount={applyLabelModalData.senders.length}
        emailCount={applyLabelModalData.emailCount}
        senders={applyLabelModalData.senders}
        emailCountMap={applyLabelModalData.emailCountMap}
      />
    </>
  )
}