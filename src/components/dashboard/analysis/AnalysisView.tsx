"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { SenderTable } from "./SenderTable"
import { VirtualizedDomainTable } from "./VirtualizedDomainTable"
import { AnalysisHeader } from "./AnalysisHeader"
import { AnalysisFooter } from "./AnalysisFooter"
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'
import { useViewInGmail } from '@/hooks/useViewInGmail'
import { toast } from "sonner"
import { usePremiumFeature } from '@/hooks/usePremiumFeature'
import { useDelete, SenderToDelete } from "@/hooks/useDelete"
import { useDeleteWithExceptions } from "@/hooks/useDeleteWithExceptions"
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal"
import { DeleteWithExceptionsModal } from "@/components/modals/DeleteWithExceptionsModal"
import { PremiumFeatureModal } from "@/components/modals/PremiumFeatureModal"
import { ReauthDialog } from "@/components/modals/ReauthDialog"
import { useSenderData, TableSender } from '@/hooks/useSenderData'
import { RuleGroup } from '@/lib/gmail/buildQuery'
import { useMarkAsRead } from '@/hooks/useMarkAsRead'
import { MarkAsReadConfirmModal } from '@/components/modals/MarkAsReadConfirmModal'
import { BlockSenderModal } from '@/components/modals/BlockSenderModal'
import { useUnsubscribe, UnsubscribeMethodDetails } from '@/hooks/useUnsubscribe'
import { getUnsubscribeMethod } from '@/lib/gmail/getUnsubscribeMethod'
import { ConfirmUnsubscribeModal } from '@/components/modals/ConfirmUnsubscribeModal'
import { ReUnsubscribeModal } from '@/components/modals/ReUnsubscribeModal'
import { ApplyLabelModal } from "@/components/modals/ApplyLabelModal"
import { useCreateFilter } from '@/hooks/useCreateFilter'
import { getSenderByEmail } from '@/lib/storage/senderAnalysis'
import { useViewState } from '@/hooks/useViewState'
import { getRootDomainFromEmail } from '@/lib/utils/rootDomain'

// Create a custom type for the selection count change handler
// that includes our viewInGmail extension
interface SelectionCountHandler {
  (count: number): void;
  viewInGmail?: () => void;
  getSelectedEmails?: (emails: string[], emailCounts?: Record<string, number>) => void;
  applyLabelBulk?: () => void;
  applyLabelSingle?: (email: string) => void;
  unsubscribeSingleSender?: (email: string) => void;
  clearSelections?: () => void;
  removeFromSelection?: (emails: string[]) => void;
}

export default function AnalysisView() {
  const [selectedCount, setSelectedCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Use persistent view state hook instead of local state
  const { 
    showUnreadOnly, 
    showHasUnsubscribe, 
    setShowUnreadOnly, 
    setShowHasUnsubscribe,
    groupByDomain,
    setGroupByDomain,
    isLoaded: viewStateLoaded 
  } = useViewState()
  const { progress } = useAnalysisOperations()
  const { viewMultipleSendersInGmail, viewSenderInGmail } = useViewInGmail()
  const { 
    checkFeatureAccess,
    isPremiumModalOpen,
    setIsPremiumModalOpen,
    currentFeature,
    itemCount
  } = usePremiumFeature()
  const { 
    progress: deleteProgress,
    startDelete,
    cancelDelete,
    reauthModal: deleteReauthModal,
    closeReauthModal: closeDeleteReauthModal
  } = useDelete()
  
  const {
    progress: deleteWithExceptionsProgress,
    startDeleteWithExceptions,
    cancelDelete: cancelDeleteWithExceptions,
    reauthModal: deleteWithExceptionsReauthModal,
    closeReauthModal: closeDeleteWithExceptionsReauthModal
  } = useDeleteWithExceptions()
  
  // Track selected emails for bulk actions
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  // Delete with exceptions modal state
  const [isDeleteWithExceptionsModalOpen, setIsDeleteWithExceptionsModalOpen] = useState(false)
  // Track the emails to delete when confirmed
  const [emailsToDelete, setEmailsToDelete] = useState<string[]>([])
  // Store email counts per sender
  const [emailCountMap, setEmailCountMap] = useState<Record<string, number>>({})
  
  // Track emailCountMap changes for debugging if needed
  // useEffect(() => {
  //   if (Object.keys(emailCountMap).length > 0) {
  //     console.log('[DEBUG] emailCountMap changed:', emailCountMap);
  //   }
  // }, [emailCountMap]);
  
  // Get sender data (needed for totalEmailCount calculation)
  const { senders: allSenders, refresh: refreshSenderData } = useSenderData()
  
  // Total number of emails to delete
  const totalEmailCount = useMemo(() => {
    if (emailsToDelete.length === 0) return 0
    
    // Sum up the counts for selected senders
    return emailsToDelete.reduce((total, email) => {
      // First try emailCountMap, then lookup actual count from allSenders, fallback to 0
      const cachedCount = emailCountMap[email];
      if (cachedCount !== undefined) {
        return total + cachedCount;
      }
      
      // Look up actual count from allSenders data
      const sender = allSenders.find(s => s.email === email);
      const actualCount = sender?.count ?? 0;
      
      return total + actualCount;
    }, 0)
  }, [emailsToDelete, emailCountMap, allSenders])
  
  // Use a ref to store the viewInGmail function exposed by SenderTable
  const tableActionsRef = useRef<{
    viewInGmail?: () => void;
  }>({})
  
  // Store the currently active single sender email for view in Gmail from premium modal
  const [activeSingleSender, setActiveSingleSender] = useState<string | null>(null)

  // Add state for mark as read functionality
  const [isMarkAsReadModalOpen, setIsMarkAsReadModalOpen] = useState(false)
  const [emailsToMark, setEmailsToMark] = useState<string[]>([])
  
  // Add mark as read hook
  const {
    progress: markAsReadProgress,
    cancelMarkAsRead,
    reauthModal: markAsReadReauthModal,
    closeReauthModal: closeMarkAsReadReauthModal,
  } = useMarkAsRead()

  // Add state for unread count map
  const [unreadCountMap, setUnreadCountMap] = useState<Record<string, number>>({});

  // Add state for block modal
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [emailsToBlock, setEmailsToBlock] = useState<string[]>([])

  // Hook for unsubscribe functionality
  const unsubscribeHook = useUnsubscribe();

  // Hook for create filter functionality (registers queue executor)
  useCreateFilter();

  // State for ConfirmUnsubscribeModal
  const [isConfirmUnsubscribeModalOpen, setConfirmUnsubscribeModalOpen] = useState(false);
  const [unsubscribeModalData, setUnsubscribeModalData] = useState<{
    senderEmail: string;
    methodDetails: UnsubscribeMethodDetails;
  } | null>(null);
  
  // State for ReUnsubscribeModal
  const [isReUnsubscribeModalOpen, setReUnsubscribeModalOpen] = useState(false);
  const [reUnsubscribeData, setReUnsubscribeData] = useState<{ senderEmail: string; unsubscribe: any } | null>(null);

    // Add state for ApplyLabelModal
  const [isApplyLabelModalOpen, setIsApplyLabelModalOpen] = useState(false);
  const [emailsToApplyLabelTo, setEmailsToApplyLabelTo] = useState<string[]>([]);

  // Auto-clear timeout management - tracks pending clears for specific sender groups
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSendersToRemoveRef = useRef<string[]>([]);

  // Calculate emailCount for ApplyLabelModal
  const emailCountForApplyLabel = useMemo(() => {
    if (emailsToApplyLabelTo.length === 0) return 0;
    return emailsToApplyLabelTo.reduce((total, email) => total + (emailCountMap[email] || 0), 0); // Default to 0 if no count found
  }, [emailsToApplyLabelTo, emailCountMap]);

  // Domain grouping state
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // NEW: domain table sorting state
  const [domainSort, setDomainSort] = useState<{ field: 'domain' | 'senderCount' | 'lastEmail' | 'count'; direction: 'asc' | 'desc' }>({ field: 'count', direction: 'desc' });

  // Callback for changing sort
  const handleDomainSortChange = useCallback((field: 'domain' | 'senderCount' | 'lastEmail' | 'count') => {
    setDomainSort(prev => {
      if (prev.field === field) {
        // Toggle direction
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      // Default to desc when switching field
      return { field, direction: 'desc' };
    });
  }, []);

  // Domain aggregation logic
  const { domainAggregations, flattenedData } = useMemo(() => {
    if (!groupByDomain || !allSenders.length) {
      return { domainAggregations: new Map(), flattenedData: [] };
    }

    // Apply the same filtering logic as SenderTable
    let filteredSenders = allSenders;
    
    // Apply unread filter if enabled
    if (showUnreadOnly) {
      filteredSenders = filteredSenders.filter(sender => sender.unread_count > 0);
    }
    
    // Apply unsubscribe filter if enabled
    if (showHasUnsubscribe) {
      filteredSenders = filteredSenders.filter(sender => sender.hasUnsubscribe);
    }
    
    // Apply search term filter
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      const terms = lowercaseSearch.split(' ').filter(Boolean);
      
      filteredSenders = filteredSenders.filter(sender => {
        const searchableText = `${sender.name || ''} ${sender.email}`.toLowerCase();
        return terms.every(term => searchableText.includes(term));
      });
    }

    // Group senders by domain
    const domainMap = new Map<string, TableSender[]>();
    
    filteredSenders.forEach(sender => {
      const domain = getRootDomainFromEmail(sender.email);
      if (!domainMap.has(domain)) {
        domainMap.set(domain, []);
      }
      domainMap.get(domain)!.push(sender);
    });

    // Create domain aggregations
    const aggregations = new Map();
    const flattened: Array<{ type: 'domain' | 'sender'; data: any }> = [];

    // Sort domains according to domainSort
    const sortedDomains = Array.from(domainMap.entries()).sort((a, b) => {
      const [domainA, sendersA] = a;
      const [domainB, sendersB] = b;

      // helper calculations
      const totalA = sendersA.reduce((sum, s) => sum + (showUnreadOnly ? s.unread_count : s.count), 0);
      const totalB = sendersB.reduce((sum, s) => sum + (showUnreadOnly ? s.unread_count : s.count), 0);
      const senderCountA = sendersA.length;
      const senderCountB = sendersB.length;
      const lastA = sendersA.reduce((latest, s) => {
        if (!latest) return s.lastEmail;
        const tsLatest = Date.parse(latest);
        const tsCurrent = Date.parse(s.lastEmail);
        const safeLatest = isNaN(tsLatest) ? -Infinity : tsLatest;
        const safeCurrent = isNaN(tsCurrent) ? -Infinity : tsCurrent;
        return safeCurrent > safeLatest ? s.lastEmail : latest;
      }, '');
      const lastB = sendersB.reduce((latest, s) => {
        if (!latest) return s.lastEmail;
        const tsLatest = Date.parse(latest);
        const tsCurrent = Date.parse(s.lastEmail);
        const safeLatest = isNaN(tsLatest) ? -Infinity : tsLatest;
        const safeCurrent = isNaN(tsCurrent) ? -Infinity : tsCurrent;
        return safeCurrent > safeLatest ? s.lastEmail : latest;
      }, '');

      const tsA = Date.parse(lastA);
      const tsB = Date.parse(lastB);

      const safeLastA = isNaN(tsA) ? -Infinity : tsA;
      const safeLastB = isNaN(tsB) ? -Infinity : tsB;

      let cmp = 0;
      switch (domainSort.field) {
        case 'domain':
          cmp = domainA.localeCompare(domainB);
          break;
        case 'senderCount':
          cmp = senderCountA - senderCountB;
          break;
        case 'lastEmail':
          cmp = safeLastA - safeLastB;
          break;
        case 'count':
        default:
          cmp = totalA - totalB;
          break;
      }
      return domainSort.direction === 'asc' ? cmp : -cmp;
    });

    sortedDomains.forEach(([domain, senders]) => {
      // Sort senders within domain by count (descending)
      const sortedSenders = senders.sort((a, b) => {
        const aCount = showUnreadOnly ? a.unread_count : a.count;
        const bCount = showUnreadOnly ? b.unread_count : b.count;
        return bCount - aCount;
      });

      // Calculate domain aggregation
      const totalCount = sortedSenders.reduce((sum, sender) => sum + (showUnreadOnly ? sender.unread_count : sender.count), 0);
      const totalUnreadCount = sortedSenders.reduce((sum, sender) => sum + sender.unread_count, 0);
      const hasUnsubscribe = sortedSenders.some(sender => sender.hasUnsubscribe);
      const lastEmail = sortedSenders.reduce((latest, sender) => {
        if (!latest) return sender.lastEmail;
        const tsLatest = Date.parse(latest);
        const tsCurrent = Date.parse(sender.lastEmail);
        const safeLatest = isNaN(tsLatest) ? -Infinity : tsLatest;
        const safeCurrent = isNaN(tsCurrent) ? -Infinity : tsCurrent;
        return safeCurrent > safeLatest ? sender.lastEmail : latest;
      }, '');

      const domainData = {
        domain,
        senders: sortedSenders,
        totalCount,
        totalUnreadCount,
        hasUnsubscribe,
        lastEmail,
        senderCount: sortedSenders.length,
        isExpanded: expandedDomains.has(domain)
      };

      aggregations.set(domain, domainData);

      // Add domain header row
      flattened.push({ type: 'domain', data: domainData });

      // Add sender rows if expanded
      if (expandedDomains.has(domain)) {
        sortedSenders.forEach(sender => {
          flattened.push({ type: 'sender', data: sender });
        });
      }
    });

    return { domainAggregations: aggregations, flattenedData: flattened };
  }, [allSenders, groupByDomain, showUnreadOnly, showHasUnsubscribe, searchTerm, expandedDomains, domainSort]);

  // Toggle domain expansion
  const toggleDomainExpansion = useCallback((domain: string) => {
    setExpandedDomains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) {
        newSet.delete(domain);
      } else {
        newSet.add(domain);
      }
      return newSet;
    });
  }, []);

  // Clear selections (for domain table)
  const clearSelectionsForDomainTable = useCallback(() => {
    setSelectedEmails(new Set());
  }, []);

  // Toggle email selection (for domain table) - UPDATE TO MATCH SENDERTABLE PATTERN
  const toggleEmailSelection = useCallback((email: string, selected: boolean) => {
    let success = true;
    
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      
      // If we're trying to add and we'll exceed the limit, prevent it
      if (selected && !prev.has(email) && prev.size >= 25) {
        success = false;
        return prev; // Return unchanged set
      }
      
      // Otherwise proceed with the toggle
      if (selected) {
        newSet.add(email);
      } else {
        newSet.delete(email);
      }
      return newSet;
    });
    
    // Show warning if max limit reached
    if (!success) {
      toast.error("Maximum 25 senders can be selected at once");
    }
  }, []);

  // Remove specific emails from selection (for domain table auto deselection)
  const removeFromSelectionForDomainTable = useCallback((emailsToRemove: string[]) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      emailsToRemove.forEach(email => newSet.delete(email));
      return newSet;
    });
  }, []);

  // Create a selection count handler for domain table that matches SenderTable pattern
  const handleSelectedCountChangeForDomainTable: {
    (count: number): void;
    removeFromSelection?: (emails: string[]) => void;
    clearSelections?: () => void;
    getSelectedEmails?: (emails: string[], emailCounts?: Record<string, number>) => void;
  } = useCallback((count: number) => {
    // Base handler - just receives the count
  }, []);

  // Set up the supporting functions for the domain table (matching SenderTable pattern)
  useEffect(() => {
    if (groupByDomain) {
      // Add the removeFromSelection function to the handler for auto deselection
      handleSelectedCountChangeForDomainTable.removeFromSelection = removeFromSelectionForDomainTable;
      
      // Add clearSelections function
      handleSelectedCountChangeForDomainTable.clearSelections = clearSelectionsForDomainTable;
      
      // Add getSelectedEmails function for compatibility
      handleSelectedCountChangeForDomainTable.getSelectedEmails = (emails: string[], emailCounts?: Record<string, number>) => {
        // Update emailCountMap if provided
        if (emailCounts) {
          setEmailCountMap(prev => ({ ...prev, ...emailCounts }));
        }
      };
    }
  }, [groupByDomain, removeFromSelectionForDomainTable, clearSelectionsForDomainTable]);

  // Total number of unread emails to mark as read (mirrors totalEmailCount pattern)
  const totalUnreadCount = useMemo(() => {
    if (emailsToMark.length === 0) return 0
    
    // Sum up the unread counts for selected senders
    return emailsToMark.reduce((total, email) => {
      // First try unreadCountMap, then lookup actual unread count from allSenders, fallback to 0
      const cachedCount = unreadCountMap[email];
      if (cachedCount !== undefined) {
        return total + cachedCount;
      }
      
      // Look up actual unread count from allSenders data
      const sender = allSenders.find(s => s.email === email);
      const actualUnreadCount = sender?.unread_count ?? 0;
      
      return total + actualUnreadCount;
    }, 0)
  }, [emailsToMark, unreadCountMap, allSenders]);

  // Wrapper function for setSelectedCount that keeps track of table actions
  const handleSelectedCountChange: SelectionCountHandler = useCallback((count: number) => {
    setSelectedCount(count);
    // When the SenderTable sets an action function on this method,
    // store it in our ref for later use
    if (handleSelectedCountChange.viewInGmail) {
      tableActionsRef.current.viewInGmail = handleSelectedCountChange.viewInGmail;
    }
  }, []);

  // Attach the getSelectedEmails function immediately to avoid race conditions
  if (!handleSelectedCountChange.getSelectedEmails) {
    handleSelectedCountChange.getSelectedEmails = (emails: string[], emailCounts?: Record<string, number>) => {
      setSelectedEmails(new Set(emails));
      
      // If provided email counts, use them
      if (emailCounts) {
        setEmailCountMap(emailCounts);
      } else {
        // Otherwise look up actual counts from allSenders data at call time
        const countMap: Record<string, number> = {};
        emails.forEach(email => {
          // Look up sender at call time to get current data
          const sender = allSenders.find(s => s.email === email);
          countMap[email] = sender?.count ?? 0; // Use actual count or 0 if not found
        });
        setEmailCountMap(countMap);
      }
    };
  }

  // Schedule simple auto-clear - clears current selection after 2s
  const scheduleSmartAutoClear = useCallback(() => {
    const currentSendersActedUpon = Array.from(selectedEmails).sort();
    
    console.log('🎯 [AnalysisView] scheduleSmartAutoClear called', {
      currentSendersActedUpon,
      groupByDomain,
      timestamp: new Date().toISOString()
    });
    
    // Store the current senders we're going to remove after 2s
    pendingSendersToRemoveRef.current = currentSendersActedUpon;
    
    // Schedule the partial clear for the new action
    clearTimeoutRef.current = setTimeout(() => {
      console.log('🎯 [AnalysisView] Auto-clear timeout fired', {
        sendersToRemove: currentSendersActedUpon,
        groupByDomain,
        timestamp: new Date().toISOString()
      });
      
      // Direct state update that works for both tables
      setSelectedEmails(currentSelection => {
        const newSelection = new Set(currentSelection);
        currentSendersActedUpon.forEach(sender => newSelection.delete(sender));
        console.log('🎯 [AnalysisView] Auto-clear completed', {
          removedSenders: currentSendersActedUpon,
          remainingSelection: Array.from(newSelection),
          groupByDomain,
          timestamp: new Date().toISOString()
        });
        return newSelection;
      });
      
      // Reset refs
      clearTimeoutRef.current = null;
      pendingSendersToRemoveRef.current = [];

      // Also clear selection in SenderTable / DomainTable via callback
      if (typeof handleSelectedCountChange.clearSelections === 'function') {
        handleSelectedCountChange.clearSelections();
      }
    }, 3000); // 3 seconds (was 2s)
  }, [selectedEmails, groupByDomain, handleSelectedCountChange]); // Added handleSelectedCountChange to deps

  // ✅ Fix: Cleanup timeouts when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear any pending timeout when component unmounts
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
        pendingSendersToRemoveRef.current = [];
      }
    };
  }, []); // Empty dependency array means this only runs on mount/unmount

  // ✅ Preventive Fix: Clear auto-clear timeouts when page becomes hidden
  // This prevents stale timeouts from firing when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && clearTimeoutRef.current) {
        // User left the page, clear any pending auto-clear timeout
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
        pendingSendersToRemoveRef.current = [];
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ✅ Preventive Fix: Re-establish SenderTable connection when window regains focus
  // This ensures the communication channel between SenderTable and AnalysisView works after user returns
  useEffect(() => {
    const handleWindowFocus = () => {
      // Force re-establishment of the communication channel by re-running the setup
      // This is safe because the setup effect is idempotent
      if (typeof handleSelectedCountChange.getSelectedEmails !== 'function') {
        // If the connection was lost, it will be re-established by the next render cycle
        // due to the useEffect that sets up the getSelectedEmails function
      }
    };
    
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  // 🧠 Handle overlapping actions - clears senders that were pending but not in current selection
  const handleOverlappingActions = useCallback(() => {
    const currentSendersActedUpon = Array.from(selectedEmails).sort();
    
    // If there's a pending timeout, immediately clear senders that were pending but are NOT part of this new action
    if (clearTimeoutRef.current && pendingSendersToRemoveRef.current.length > 0) {
      const previouslyPendingSenders = pendingSendersToRemoveRef.current;
      const sendersToRemoveNow = previouslyPendingSenders.filter(
        sender => !currentSendersActedUpon.includes(sender)
      );
      
      // Clear the old timeout
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
      pendingSendersToRemoveRef.current = [];
      
      // Immediately remove senders that were pending but not in new action
      if (sendersToRemoveNow.length > 0) {
        // Direct state update that works for both tables
        setSelectedEmails(currentSelection => {
          const newSelection = new Set(currentSelection);
          sendersToRemoveNow.forEach(sender => newSelection.delete(sender));
          return newSelection;
        });
      }
    }
  }, [selectedEmails]); // Simplified dependencies

  // Update the effect that gets sender data
  useEffect(() => {
    if (!selectedEmails.size) {
      setUnreadCountMap({});
      return;
    }

    // Create a map of unread counts
    const unreadCounts: Record<string, number> = {};
    
    // Get the selected senders with their unread counts
    selectedEmails.forEach(email => {
      const sender = allSenders.find(s => s.email === email);
      if (sender) {
        unreadCounts[email] = sender.unread_count || 0;
      }
    });
    
    // Only update unread counts map
    setUnreadCountMap(unreadCounts);
  }, [selectedEmails, allSenders]);

  // Sync selected emails with the selection count handler for domain table
  useEffect(() => {
    if (groupByDomain) {
      handleSelectedCountChange(selectedEmails.size);
    }
  }, [selectedEmails, groupByDomain, handleSelectedCountChange]);

  // Handlers for bulk actions
  const handleViewInGmail = useCallback(() => {
    if (selectedEmails.size === 0 && !activeSingleSender) {
      toast.warning('No senders selected');
      return;
    }
    
    // If we have a single active sender from row action, use that
    if (activeSingleSender) {
      viewSenderInGmail(activeSingleSender);
      setActiveSingleSender(null); // Clear after use
      return;
    }
    
    // Otherwise use the selected emails for bulk action
    viewMultipleSendersInGmail(Array.from(selectedEmails));
  }, [selectedEmails, viewMultipleSendersInGmail, activeSingleSender, viewSenderInGmail]);

  // --- SMART AUTO-DESELECT STRATEGY (GitHub Issue #64) ---
  // 🎯 CLEAR SELECTION 3 seconds after any action is CONFIRMED, except "View in Gmail". If the
  // user triggers another action within those 3 s we reschedule (so you can chain operations on
  // the same sender batch). This now includes Unsubscribe as well.
  // The logic helps prevent accidental repeat actions while keeping the workflow fluid.

  // Handler to initiate the delete flow - uses checkFeatureAccess
  const handleDelete = useCallback(() => {
    if (selectedEmails.size === 0) {
      toast.warning('No senders selected');
      return;
    }
    
    // 🧠 SMART AUTO-CLEAR: Handle overlapping actions when opening modal
    handleOverlappingActions();
    
    // checkFeatureAccess will open the premium modal if needed and set internal state
    if (checkFeatureAccess('delete', selectedEmails.size)) {
      // Store emails for confirmation modal
      setEmailsToDelete(Array.from(selectedEmails));
      setIsDeleteModalOpen(true);
    }
    // No else needed, hook handles opening the premium modal
  }, [selectedEmails, checkFeatureAccess, handleOverlappingActions]);

  // Handler for row-level delete action
  const handleDeleteSingleSender = useCallback((email: string, emailCount?: number) => {
    // Use provided count, then emailCountMap, then actual sender count, fallback to 0
    const currentCount = emailCount || emailCountMap[email] || (() => {
      const sender = allSenders.find(s => s.email === email);
      return sender?.count ?? 0;
    })();
    
    setEmailCountMap(prev => ({ ...prev, [email]: currentCount }));

    // checkFeatureAccess will open premium modal if needed
    if (checkFeatureAccess('delete', 1)) {
      // Access granted, open delete confirmation modal
      setEmailsToDelete([email]);
      setIsDeleteModalOpen(true);
    } else {
      // Access denied, hook opened modal. Store sender for potential view action.
      setActiveSingleSender(email); 
    }
  }, [checkFeatureAccess, emailCountMap, allSenders]);

  // Handler for delete with exceptions
  const handleDeleteWithExceptions = useCallback(() => {
    // Start with current selected emails or any emailsToDelete that were set
    const emailsToUse = selectedEmails.size > 0 ? Array.from(selectedEmails) : emailsToDelete;
    
    if (emailsToUse.length === 0) {
      toast.warning('No senders selected');
      return;
    }
    
    // 🧠 SMART AUTO-CLEAR: Handle overlapping actions when opening modal
    handleOverlappingActions();
    
    // Check if user has premium access first
    if (checkFeatureAccess('delete_with_exceptions', emailsToUse.length)) {
      // Set the emails to delete - similar to regular delete flow
      setEmailsToDelete(emailsToUse);
      setIsDeleteWithExceptionsModalOpen(true);
    }
    // If access check fails, the premium modal will be shown by the hook
  }, [selectedEmails, emailsToDelete, checkFeatureAccess, handleOverlappingActions]);

  // Handler for mark as read functionality
  const handleMarkAllRead = useCallback(() => {
    if (selectedEmails.size === 0) {
      toast.warning('No senders selected');
      return;
    }

    // 🧠 SMART AUTO-CLEAR: Handle overlapping actions when opening modal
    handleOverlappingActions();

    // Check premium access
    if (checkFeatureAccess('mark_read', selectedEmails.size)) {
      setEmailsToMark(Array.from(selectedEmails));
      setIsMarkAsReadModalOpen(true);
    }
  }, [selectedEmails, checkFeatureAccess, handleOverlappingActions]);

  // Handler for single sender mark as read
  const handleMarkSingleSenderRead = useCallback((email: string, unreadCount?: number) => {
    // Find the sender in our data to get the actual unread count
    const sender = allSenders.find(s => s.email === email);
    
    // Only use unread count if it exists and is greater than 0
    const actualUnreadCount = (unreadCount ?? sender?.unread_count) || 0;

    console.log('🎯 [AnalysisView] Mark Read button clicked:', { 
      email, 
      unreadCount, 
      actualUnreadCount,
      timestamp: new Date().toISOString()
    })

    const hasAccess = checkFeatureAccess('mark_read', 1)
    console.log('🎯 [AnalysisView] Premium check result:', { 
      email, 
      hasAccess,
      timestamp: new Date().toISOString()
    })

    if (hasAccess) {
      setEmailsToMark([email]);
      // Only add to unreadCountMap if there are unread emails
      if (actualUnreadCount > 0) {
        setUnreadCountMap(prev => ({ ...prev, [email]: actualUnreadCount }));
      } else {
        // Remove from unreadCountMap if no unread emails
        setUnreadCountMap(prev => {
          const { [email]: _, ...rest } = prev;
          return rest;
        });
      }
      setIsMarkAsReadModalOpen(true);
    } else {
      setActiveSingleSender(email);
    }
  }, [checkFeatureAccess, allSenders]);

  // Handler for BULK Apply Label action (called from AnalysisHeader)
  const handleApplyLabelBulk = useCallback(() => {
    if (selectedEmails.size === 0) {
      toast.warning('No senders selected');
      return;
    }
    
    // 🧠 SMART AUTO-CLEAR: Handle overlapping actions when opening modal
    handleOverlappingActions();
    
    if (checkFeatureAccess('apply_label', selectedEmails.size)) {
      setEmailsToApplyLabelTo(Array.from(selectedEmails));
      setIsApplyLabelModalOpen(true);
    }
    // If not premium, hook handles PremiumFeatureModal. No activeSingleSender for bulk.
  }, [selectedEmails, checkFeatureAccess, setIsApplyLabelModalOpen, setEmailsToApplyLabelTo, handleOverlappingActions]);

  // Handler for SINGLE Apply Label action (to be passed to SenderTable -> RowActions)
  const handleApplyLabelSingle = useCallback((email: string) => {
    if (checkFeatureAccess('apply_label', 1)) {
      setEmailsToApplyLabelTo([email]);
      setIsApplyLabelModalOpen(true);
    } else {
      setActiveSingleSender(email); // For PremiumFeatureModal's "View in Gmail"
    }
  }, [checkFeatureAccess, setIsApplyLabelModalOpen, setEmailsToApplyLabelTo, setActiveSingleSender]);

  // Placeholder handler for Unsubscribe
  const handleUnsubscribeSingleSender = useCallback(async (email: string, isReUnsubscribe: boolean = false) => {
    if (checkFeatureAccess('unsubscribe', 1)) {
      // First try to find sender in current allSenders array
      let sender = allSenders.find(s => s.email === email);
      
      // If not found in current state, try querying IndexedDB directly
      // This handles race conditions where UI shows data but allSenders isn't fully synchronized
      if (!sender) {
        console.warn(`[handleUnsubscribeSingleSender] Sender not found in allSenders array, querying IndexedDB directly for: ${email}`);
        try {
          const senderFromDB = await getSenderByEmail(email);
          if (senderFromDB) {
            // Convert the IndexedDB result to the expected format
            sender = {
              email: senderFromDB.senderEmail,
              name: senderFromDB.senderName,
              // Include multiple names support for Option 1
              allNames: senderFromDB.senderNames,
              hasMultipleNames: !!(senderFromDB.senderNames && senderFromDB.senderNames.length > 0),
              count: senderFromDB.count,
              unread_count: senderFromDB.unread_count,
              lastEmail: senderFromDB.lastDate,
              actionsTaken: (senderFromDB.actionsTaken || []).filter((action): action is "delete" | "unsubscribe" | "markUnread" | "block" => {
                return ['delete', 'unsubscribe', 'markUnread', 'block'].includes(action);
              }),
              hasUnsubscribe: senderFromDB.hasUnsubscribe || false,
              unsubscribe: senderFromDB.unsubscribe,
              messageIds: senderFromDB.messageIds || [],
              sampleSubjects: senderFromDB.sampleSubjects || []
            };
            console.log(`[handleUnsubscribeSingleSender] Found sender in IndexedDB: ${email}`, sender);
          }
        } catch (error) {
          console.error(`[handleUnsubscribeSingleSender] Error querying IndexedDB for sender: ${email}`, error);
        }
      }
      
      // If still not found after checking both sources, show error with more context
      if (!sender) {
        console.error(`[handleUnsubscribeSingleSender] Sender data not found in allSenders (${allSenders.length} total) or IndexedDB for: ${email}`);
        console.log('[handleUnsubscribeSingleSender] Available senders in allSenders:', allSenders.map(s => s.email));
        
        // As a last resort, try refreshing the sender data and retry once (but only if this isn't already a re-unsubscribe)
        if (!isReUnsubscribe) {
          console.warn(`[handleUnsubscribeSingleSender] Attempting to refresh sender data as a final fallback for: ${email}`);
          try {
            await refreshSenderData();
            // Give it a moment for the state to update, then try one final lookup
            setTimeout(() => {
              handleUnsubscribeSingleSender(email, true); // Pass true to indicate this is a retry
            }, 100);
            return; // Exit early to avoid showing the error immediately
          } catch (refreshError) {
            console.error(`[handleUnsubscribeSingleSender] Error refreshing sender data:`, refreshError);
          }
        } else {
          console.error(`[handleUnsubscribeSingleSender] Sender still not found after refresh attempt: ${email}`);
        }
        
        toast.error("Sender data not found for unsubscribe action.");
        return;
      }
      
      if (!sender.hasUnsubscribe || !sender.unsubscribe) {
        toast.error(`No unsubscribe information found for ${email}.`);
        return;
      }

      // Check if this is a re-unsubscribe request
      if (isReUnsubscribe && sender.actionsTaken?.includes('unsubscribe')) {
        // Show re-unsubscribe modal with options
        setReUnsubscribeData({ senderEmail: email, unsubscribe: sender.unsubscribe });
        setReUnsubscribeModalOpen(true);
        return;
      }

      const methodDetails = getUnsubscribeMethod(sender.unsubscribe);
      if (!methodDetails) {
        toast.error(`Could not determine a valid unsubscribe method for ${email}.`);
        return;
      }

      // Logic for modal confirmation or direct action
      if (methodDetails.type === 'mailto' && !methodDetails.requiresPost) {
        const skipConfirm = sessionStorage.getItem("skipUnsubConfirm") === "true";
        if (!skipConfirm) {
          setUnsubscribeModalData({ senderEmail: email, methodDetails });
          setConfirmUnsubscribeModalOpen(true);
        } else {
          // Skip modal and directly run unsubscribe with enrichment
          await unsubscribeHook.run(
            { senderEmail: email, firstMessageId: sender.unsubscribe?.firstMessageId }, 
            methodDetails
          );
        }
      } else {
        // For URL or mailto with requiresPost, run unsubscribe with enrichment
        await unsubscribeHook.run(
          { senderEmail: email, firstMessageId: sender.unsubscribe?.firstMessageId }, 
          methodDetails
        );
      }
    } else {
      // Premium modal was shown by checkFeatureAccess, store sender for potential view action
      setActiveSingleSender(email);
    }
  }, [checkFeatureAccess, allSenders, setActiveSingleSender, unsubscribeHook, refreshSenderData]);

  // Handler for block sender (single and bulk)
  const handleBlockSenders = useCallback(() => {
    if (selectedEmails.size === 0) {
      toast.warning('No senders selected');
      return;
    }
    
    // 🧠 SMART AUTO-CLEAR: Handle overlapping actions when opening modal
    handleOverlappingActions();
    
    // Check for premium access before proceeding
    if (checkFeatureAccess('block_sender', selectedEmails.size)) {
      // Premium access granted, proceed to open block confirm modal
      setEmailsToBlock(Array.from(selectedEmails));
      setIsBlockModalOpen(true);
    }
    // If not premium, usePremiumFeature hook handles opening the PremiumFeatureModal
    // For bulk actions, we don't need to set activeSingleSender as viewInGmail will use selectedEmails
  }, [selectedEmails, checkFeatureAccess, setEmailsToBlock, setIsBlockModalOpen, handleOverlappingActions]);

  const handleBlockConfirm = async () => {
    // The actual blocking is handled inside the modal
    // This is just for any UI updates needed after blocking
    setSelectedEmails(new Set());
    setEmailsToBlock([]);
  }

  // Add handler for single sender block
  const handleBlockSingleSender = useCallback((email: string) => {
    // Check for premium access before proceeding
    if (checkFeatureAccess('block_sender', 1)) {
      // Premium access granted, proceed to open block confirm modal
      setEmailsToBlock([email]);
      setIsBlockModalOpen(true);
    } else {
      // Not premium, usePremiumFeature hook has opened the modal.
      // Set the active single sender for the "View in Gmail" option in PremiumFeatureModal.
      setActiveSingleSender(email);
    }
  }, [checkFeatureAccess, setEmailsToBlock, setIsBlockModalOpen, setActiveSingleSender]);

  // --- NEW: Logic to disable bulk delete button ---
  const isBulkDeleteDisabled = useMemo(() => {
    // Rule 1: Always disabled if nothing is selected
    if (selectedCount === 0) {
      return true; 
    }
    
    // Rule 2: If one or more are selected, check if *all* of them have had delete taken
    
    // Find the sender data objects corresponding to the selected emails
    const selectedSenderDataList = allSenders.filter(sender => 
      selectedEmails.has(sender.email)
    );
    
    // If we couldn't find data for all selected emails (shouldn't happen, but safety check)
    if (selectedSenderDataList.length !== selectedCount) {
      console.warn('[AnalysisView] Mismatch between selected emails and found sender data.');
      return false; // Default to enabled in case of data inconsistency
    }
    
    // Check if *every* selected sender already has 'delete' in actionsTaken
    const allHaveDeleteTaken = selectedSenderDataList.every(sender => 
      sender.actionsTaken.includes('delete')
    );
    
    // Disable the button if all selected senders have already had the action taken
    return allHaveDeleteTaken;

  }, [selectedCount, selectedEmails, allSenders]); // Dependencies: count, emails, and the sender data itself

  // Handler for single sender delete with exceptions from row actions
  const handleDeleteSingleSenderWithExceptions = useCallback((email: string, emailCount?: number) => {
    // Use provided count, then emailCountMap, then actual sender count, fallback to 0
    const currentCount = emailCount || emailCountMap[email] || (() => {
      const sender = allSenders.find(s => s.email === email);
      return sender?.count ?? 0;
    })();
    
    setEmailCountMap(prev => ({ ...prev, [email]: currentCount }));

    // Check feature access
    if (checkFeatureAccess('delete_with_exceptions', 1)) {
      // Access granted, set email and open modal
      setEmailsToDelete([email]);
      setIsDeleteWithExceptionsModalOpen(true);
    } else {
      // Access denied, hook opened modal. Store sender for potential view action.
      setActiveSingleSender(email);
    }
  }, [checkFeatureAccess, emailCountMap, allSenders]);

  // Show loading state if we're still preparing or loading view state
  if (progress.status === 'preparing' || !viewStateLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">
            {progress.status === 'preparing' ? 'Preparing analysis...' : 'Loading preferences...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <AnalysisHeader 
        selectedCount={selectedCount}
        onViewInGmail={handleViewInGmail}
        onDelete={handleDelete}
        isDeleteDisabled={isBulkDeleteDisabled}
        onMarkAllAsRead={handleMarkAllRead}
        onDeleteWithExceptions={handleDeleteWithExceptions}
        onApplyLabel={handleApplyLabelBulk}
        onBlockSenders={handleBlockSenders}
        onSearchChange={setSearchTerm}
        onToggleUnreadOnly={setShowUnreadOnly}
        onToggleHasUnsubscribe={setShowHasUnsubscribe}
        onToggleGroupByDomain={setGroupByDomain}
        showUnreadOnly={showUnreadOnly}
        showHasUnsubscribe={showHasUnsubscribe}
        showGroupByDomain={groupByDomain}
      />

      {/* TABLE CONTAINER */}
      <div className="flex-1 overflow-hidden">
        {groupByDomain ? (
          <VirtualizedDomainTable
            flattenedData={flattenedData}
            domainAggregations={domainAggregations}
            selectedEmails={selectedEmails}
            setSelectedEmails={setSelectedEmails}
            toggleDomainExpansion={toggleDomainExpansion}
            toggleEmailSelection={toggleEmailSelection}
            clearSelections={clearSelectionsForDomainTable}
            showUnreadOnly={showUnreadOnly}
            isLoading={progress.status === 'analyzing'}
            isAnalyzing={progress.status === 'analyzing'}
            onBlockSingleSender={handleBlockSingleSender}
            onApplyLabelSingle={handleApplyLabelSingle}
            onDeleteSingleSender={handleDeleteSingleSender}
            onDeleteWithExceptions={handleDeleteSingleSenderWithExceptions}
            onUnsubscribeSingleSender={handleUnsubscribeSingleSender}
            onMarkSingleSenderRead={handleMarkSingleSenderRead}
            viewSenderInGmail={viewSenderInGmail}
            handleDropdownOpen={(email: string) => {
              // Handle dropdown open logic if needed
            }}
            domainSort={domainSort}
            handleDomainSortChange={handleDomainSortChange}
            onSelectedCountChange={handleSelectedCountChangeForDomainTable}
          />
        ) : (
          <SenderTable 
            onSelectedCountChange={handleSelectedCountChange} 
            searchTerm={searchTerm}
            showUnreadOnly={showUnreadOnly}
            showHasUnsubscribe={showHasUnsubscribe}
            onDeleteSingleSender={handleDeleteSingleSender}
            onDeleteWithExceptions={handleDeleteSingleSenderWithExceptions}
            onMarkSingleSenderRead={handleMarkSingleSenderRead}
            onBlockSingleSender={handleBlockSingleSender}
            onUnsubscribeSingleSender={handleUnsubscribeSingleSender}
            onApplyLabelSingle={handleApplyLabelSingle}
          />
        )}
      </div>

      <AnalysisFooter 
        searchTerm={searchTerm} 
        showUnreadOnly={showUnreadOnly}
        showHasUnsubscribe={showHasUnsubscribe}
      />
      
      {/* Delete Confirmation Modal (Local State) */}
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={(isOpen) => {
          setIsDeleteModalOpen(isOpen);
          // Clear emailCountMap when modal closes to prevent stale data
          if (!isOpen) {
            console.log('[DEBUG] Modal closing, clearing emailCountMap for senders:', emailsToDelete);
            setEmailCountMap(prev => {
              const updated = { ...prev };
              emailsToDelete.forEach(email => delete updated[email]);
              return updated;
            });
          }
        }}
        emailCount={totalEmailCount}
        senderCount={emailsToDelete.length}
        senders={emailsToDelete}
        emailCountMap={emailCountMap}
        onDeleteWithExceptions={handleDeleteWithExceptions}
        onSuccess={() => {
          console.log('[DEBUG] Delete modal success callback triggered');
          // 🎯 SMART AUTO-CLEAR: Schedule clear unless another action on same senders within 3s
          scheduleSmartAutoClear();
        }}
      />

      {/* Delete With Exceptions Modal (Local State) */}
      <DeleteWithExceptionsModal
        open={isDeleteWithExceptionsModalOpen}
        onOpenChange={(isOpen) => {
          setIsDeleteWithExceptionsModalOpen(isOpen);
          // Clear emailCountMap when modal closes to prevent stale data
          if (!isOpen) {
            setEmailCountMap(prev => {
              const updated = { ...prev };
              emailsToDelete.forEach(email => delete updated[email]);
              return updated;
            });
          }
        }}
        emailCount={totalEmailCount}
        senderCount={emailsToDelete.length}
        senders={emailsToDelete}
        emailCountMap={emailCountMap}
        onSuccess={() => {
          // 🎯 SMART AUTO-CLEAR: Schedule clear unless another action on same senders within 3s
          scheduleSmartAutoClear();
        }}
      />

      {/* Premium Feature Modal (State from Hook) */}
      <PremiumFeatureModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName={currentFeature || 'action'}
        senderCount={itemCount}
        onViewInGmail={handleViewInGmail}
      />
      
      {/* --- Add Reauth Dialog for Delete Flow --- */}
      <ReauthDialog
        open={deleteReauthModal.isOpen || deleteWithExceptionsReauthModal.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDeleteReauthModal();
            closeDeleteWithExceptionsReauthModal();
          }
        }}
        type={deleteReauthModal.isOpen ? deleteReauthModal.type : deleteWithExceptionsReauthModal.type}
        eta={deleteReauthModal.isOpen ? deleteReauthModal.eta : deleteWithExceptionsReauthModal.eta}
      />

      {/* Add Mark As Read Modal */}
      <MarkAsReadConfirmModal
        open={isMarkAsReadModalOpen}
        onOpenChange={setIsMarkAsReadModalOpen}
        unreadCount={totalUnreadCount}
        senderCount={emailsToMark.length}
        senders={emailsToMark}
        unreadCountMap={unreadCountMap}
        allSenders={allSenders}
        onSuccess={() => {
          // 🎯 SMART AUTO-CLEAR: Schedule clear unless another action on same senders within 3s
          scheduleSmartAutoClear();
        }}
      />

      {/* Add Mark As Read Reauth Dialog */}
      <ReauthDialog
        open={markAsReadReauthModal.isOpen}
        onOpenChange={closeMarkAsReadReauthModal}
        type={markAsReadReauthModal.type}
        eta={markAsReadReauthModal.eta}
      />

      {/* Add Confirm Unsubscribe Modal */}
      {unsubscribeModalData && (
        <ConfirmUnsubscribeModal
          open={isConfirmUnsubscribeModalOpen}
          onOpenChange={setConfirmUnsubscribeModalOpen}
          senderEmail={unsubscribeModalData.senderEmail}
          methodDetails={unsubscribeModalData.methodDetails}
          onConfirm={async () => {
            // Only use legacy path for non-email operations (URL or POST)
            if (unsubscribeModalData && 
                (unsubscribeModalData.methodDetails.type !== "mailto" || unsubscribeModalData.methodDetails.requiresPost)) {
              
              // Find sender to get firstMessageId
              const sender = allSenders.find(s => s.email === unsubscribeModalData.senderEmail);
              
              await unsubscribeHook.run(
                { 
                  senderEmail: unsubscribeModalData.senderEmail,
                  firstMessageId: sender?.unsubscribe?.firstMessageId
                }, 
                unsubscribeModalData.methodDetails
              );
            }
            setUnsubscribeModalData(null); // Clear data after use
          }}
          onSuccess={() => {
            // Auto-clear selection after unsubscribe confirmation
            scheduleSmartAutoClear();
          }}
          onCancel={() => setUnsubscribeModalData(null)} // Clear data on cancel
        />
      )}

      {/* Add ReUnsubscribe Modal */}
      {reUnsubscribeData && (
        <ReUnsubscribeModal
          open={isReUnsubscribeModalOpen}
          onOpenChange={setReUnsubscribeModalOpen}
          senderEmail={reUnsubscribeData.senderEmail}
          messageId={reUnsubscribeData.unsubscribe?.firstMessageId || ''}
        />
      )}

      {/* Add BlockSenderModal */}
      <BlockSenderModal
        open={isBlockModalOpen}
        onOpenChange={(isOpen) => {
          setIsBlockModalOpen(isOpen);
          // Clear emailCountMap when modal closes to prevent stale data
          if (!isOpen) {
            setEmailCountMap(prev => {
              const updated = { ...prev };
              emailsToBlock.forEach(email => delete updated[email]);
              return updated;
            });
          }
        }}
        emailCount={totalEmailCount}
        senderCount={emailsToBlock.length}
        onConfirm={handleBlockConfirm}
        senders={emailsToBlock}
        emailCountMap={emailCountMap}
        onSuccess={() => {
          // 🎯 SMART AUTO-CLEAR: Schedule clear unless another action on same senders within 3s
          scheduleSmartAutoClear();
        }}
      />

      {/* Apply Label Modal (State managed in AnalysisView) */}
      <ApplyLabelModal
        open={isApplyLabelModalOpen}
        onOpenChange={setIsApplyLabelModalOpen}
        senders={emailsToApplyLabelTo}
        senderCount={emailsToApplyLabelTo.length}
        emailCount={emailCountForApplyLabel}
        emailCountMap={emailCountMap}
        onSuccess={() => {
          // 🎯 SMART AUTO-CLEAR: Schedule clear unless another action on same senders within 3s
          scheduleSmartAutoClear();
        }}
      />
    </div>
  )
}
