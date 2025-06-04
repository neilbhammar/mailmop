"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { SenderTable } from "./SenderTable"
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
import { ApplyLabelModal } from "@/components/modals/ApplyLabelModal"
import { useCreateFilter } from '@/hooks/useCreateFilter'

// Create a custom type for the selection count change handler
// that includes our viewInGmail extension
interface SelectionCountHandler {
  (count: number): void;
  viewInGmail?: () => void;
  getSelectedEmails?: (emails: string[], emailCounts?: Record<string, number>) => void;
  applyLabelBulk?: () => void;
  applyLabelSingle?: (email: string) => void;
  unsubscribeSingleSender?: (email: string) => void;
}

export default function AnalysisView() {
  const [selectedCount, setSelectedCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
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
  // Total number of emails to delete
  const totalEmailCount = useMemo(() => {
    if (emailsToDelete.length === 0) return 0
    
    // Sum up the counts for selected senders
    return emailsToDelete.reduce((total, email) => total + (emailCountMap[email] || 30), 0)
  }, [emailsToDelete, emailCountMap])
  
  // Use a ref to store the viewInGmail function exposed by SenderTable
  const tableActionsRef = useRef<{
    viewInGmail?: () => void;
  }>({})
  
  // Store the currently active single sender email for view in Gmail from premium modal
  const [activeSingleSender, setActiveSingleSender] = useState<string | null>(null)

  const { senders: allSenders } = useSenderData()

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

  // Add state for ApplyLabelModal
  const [isApplyLabelModalOpen, setIsApplyLabelModalOpen] = useState(false);
  const [emailsToApplyLabelTo, setEmailsToApplyLabelTo] = useState<string[]>([]);

  // Calculate emailCount for ApplyLabelModal
  const emailCountForApplyLabel = useMemo(() => {
    if (emailsToApplyLabelTo.length === 0) return 0;
    return emailsToApplyLabelTo.reduce((total, email) => total + (emailCountMap[email] || 0), 0); // Default to 0 if no count found
  }, [emailsToApplyLabelTo, emailCountMap]);

  // Wrapper function for setSelectedCount that keeps track of table actions
  const handleSelectedCountChange: SelectionCountHandler = useCallback((count: number) => {
    setSelectedCount(count);
    // When the SenderTable sets an action function on this method,
    // store it in our ref for later use
    if (handleSelectedCountChange.viewInGmail) {
      tableActionsRef.current.viewInGmail = handleSelectedCountChange.viewInGmail;
    }
  }, []);

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

  // Set up a side effect to receive selected emails from the table
  useEffect(() => {
    // @ts-ignore - Adding a method to the component instance
    handleSelectedCountChange.getSelectedEmails = (emails: string[], emailCounts?: Record<string, number>) => {
      setSelectedEmails(new Set(emails));
      
      // If provided email counts, use them
      if (emailCounts) {
        setEmailCountMap(emailCounts);
      } else {
        // Otherwise create an even distribution with default counts (30 per sender)
        const countMap: Record<string, number> = {};
        emails.forEach(email => {
          countMap[email] = 30; // Default of 30 emails per sender
        });
        setEmailCountMap(countMap);
      }
    };
  }, []);

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

  // Handler to initiate the delete flow - uses checkFeatureAccess
  const handleDelete = useCallback(() => {
    if (selectedEmails.size === 0) {
      toast.warning('No senders selected');
      return;
    }
    // checkFeatureAccess will open the premium modal if needed and set internal state
    if (checkFeatureAccess('delete', selectedEmails.size)) {
      // If access granted, proceed to open delete confirm modal
      setEmailsToDelete(Array.from(selectedEmails));
      setIsDeleteModalOpen(true);
    }
    // No else needed, hook handles opening the premium modal
  }, [selectedEmails, checkFeatureAccess]);

  // Handler for row-level delete action
  const handleDeleteSingleSender = useCallback((email: string, emailCount?: number) => {
    const currentCount = emailCount || emailCountMap[email] || 30;
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
  }, [checkFeatureAccess, emailCountMap]);

  // Handler for delete with exceptions
  const handleDeleteWithExceptions = useCallback(() => {
    // Start with current selected emails or any emailsToDelete that were set
    const emailsToUse = selectedEmails.size > 0 ? Array.from(selectedEmails) : emailsToDelete;
    
    if (emailsToUse.length === 0) {
      toast.warning('No senders selected');
      return;
    }
    
    // Check if user has premium access first
    if (checkFeatureAccess('delete_with_exceptions', emailsToUse.length)) {
      // Set the emails to delete - similar to regular delete flow
      setEmailsToDelete(emailsToUse);
      // Open the delete with exceptions modal
      setIsDeleteWithExceptionsModalOpen(true);
    }
    // If access check fails, the premium modal will be shown by the hook
  }, [selectedEmails, emailsToDelete, checkFeatureAccess]);

  // Handler for mark as read functionality
  const handleMarkAllRead = useCallback(() => {
    if (selectedEmails.size === 0) {
      toast.warning('No senders selected');
      return;
    }

    // Check premium access
    if (checkFeatureAccess('mark_read', selectedEmails.size)) {
      setEmailsToMark(Array.from(selectedEmails));
      setIsMarkAsReadModalOpen(true);
    }
  }, [selectedEmails, checkFeatureAccess]);

  // Handler for single sender mark as read
  const handleMarkSingleSenderRead = useCallback((email: string, unreadCount?: number) => {
    // Find the sender in our data to get the actual unread count
    const sender = allSenders.find(s => s.email === email);
    
    // Only use unread count if it exists and is greater than 0
    const actualUnreadCount = (unreadCount ?? sender?.unread_count) || 0;

    if (checkFeatureAccess('mark_read', 1)) {
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
    if (checkFeatureAccess('apply_label', selectedEmails.size)) {
      setEmailsToApplyLabelTo(Array.from(selectedEmails));
      setIsApplyLabelModalOpen(true);
    }
    // If not premium, hook handles PremiumFeatureModal. No activeSingleSender for bulk.
  }, [selectedEmails, checkFeatureAccess, setIsApplyLabelModalOpen, setEmailsToApplyLabelTo]);

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
  const handleUnsubscribeSingleSender = useCallback(async (email: string) => {
    if (checkFeatureAccess('unsubscribe', 1)) {
      const sender = allSenders.find(s => s.email === email);
      if (!sender) {
        toast.error("Sender data not found for unsubscribe action.");
        return;
      }
      if (!sender.hasUnsubscribe || !sender.unsubscribe) {
        toast.error(`No unsubscribe information found for ${email}.`);
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
          // Skip modal and directly run unsubscribe
          await unsubscribeHook.run({ senderEmail: email }, methodDetails);
        }
      } else {
        // For URL or mailto with requiresPost, run directly
        await unsubscribeHook.run({ senderEmail: email }, methodDetails);
      }
    } else {
      // Premium modal was shown by checkFeatureAccess, store sender for potential view action
      setActiveSingleSender(email);
    }
  }, [checkFeatureAccess, allSenders, setActiveSingleSender, unsubscribeHook]);

  // Handler for block sender (single and bulk)
  const handleBlockSenders = useCallback(() => {
    if (selectedEmails.size === 0) {
      toast.warning('No senders selected');
      return;
    }
    // Check for premium access before proceeding
    if (checkFeatureAccess('block_sender', selectedEmails.size)) {
      // Premium access granted, proceed to open block confirm modal
      setEmailsToBlock(Array.from(selectedEmails));
      setIsBlockModalOpen(true);
    }
    // If not premium, usePremiumFeature hook handles opening the PremiumFeatureModal
    // For bulk actions, we don't need to set activeSingleSender as viewInGmail will use selectedEmails
  }, [selectedEmails, checkFeatureAccess, setEmailsToBlock, setIsBlockModalOpen]);

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
    const currentCount = emailCount || emailCountMap[email] || 30;
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
  }, [checkFeatureAccess, emailCountMap]);

  // Show loading state if we're still preparing
  if (progress.status === 'preparing') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Preparing analysis...</p>
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
      />

      {/* TABLE CONTAINER */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <SenderTable 
            onSelectedCountChange={handleSelectedCountChange} 
            searchTerm={searchTerm}
            showUnreadOnly={showUnreadOnly}
            onDeleteSingleSender={handleDeleteSingleSender}
            onDeleteWithExceptions={handleDeleteSingleSenderWithExceptions}
            onMarkSingleSenderRead={handleMarkSingleSenderRead}
            onBlockSingleSender={handleBlockSingleSender}
            onUnsubscribeSingleSender={handleUnsubscribeSingleSender}
            onApplyLabelSingle={handleApplyLabelSingle}
          />
        </div>
      </div>

      <AnalysisFooter 
        searchTerm={searchTerm} 
        showUnreadOnly={showUnreadOnly}
      />
      
      {/* Delete Confirmation Modal (Local State) */}
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        emailCount={totalEmailCount}
        senderCount={emailsToDelete.length}
        senders={emailsToDelete}
        emailCountMap={emailCountMap}
        onDeleteWithExceptions={handleDeleteWithExceptions}
      />

      {/* Delete With Exceptions Modal (Local State) */}
      <DeleteWithExceptionsModal
        open={isDeleteWithExceptionsModalOpen}
        onOpenChange={setIsDeleteWithExceptionsModalOpen}
        emailCount={totalEmailCount}
        senderCount={emailsToDelete.length}
        senders={emailsToDelete}
        emailCountMap={emailCountMap}
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
        unreadCount={emailsToMark.reduce((sum, email) => sum + (unreadCountMap[email] || 0), 0)}
        senderCount={emailsToMark.length}
        senders={emailsToMark}
        unreadCountMap={unreadCountMap}
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
              await unsubscribeHook.run(
                { senderEmail: unsubscribeModalData.senderEmail }, 
                unsubscribeModalData.methodDetails
              );
            }
            setUnsubscribeModalData(null); // Clear data after use
          }}
          onCancel={() => setUnsubscribeModalData(null)} // Clear data on cancel
        />
      )}

      {/* Add BlockSenderModal */}
      <BlockSenderModal
        open={isBlockModalOpen}
        onOpenChange={setIsBlockModalOpen}
        emailCount={totalEmailCount}
        senderCount={emailsToBlock.length}
        onConfirm={handleBlockConfirm}
        senders={emailsToBlock}
        emailCountMap={emailCountMap}
      />

      {/* Apply Label Modal (State managed in AnalysisView) */}
      <ApplyLabelModal
        open={isApplyLabelModalOpen}
        onOpenChange={setIsApplyLabelModalOpen}
        senders={emailsToApplyLabelTo}
        senderCount={emailsToApplyLabelTo.length}
        emailCount={emailCountForApplyLabel}
        emailCountMap={emailCountMap}
      />
    </div>
  )
}
