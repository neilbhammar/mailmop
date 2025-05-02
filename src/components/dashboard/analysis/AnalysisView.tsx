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
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal"
import { PremiumFeatureModal } from "@/components/modals/PremiumFeatureModal"
import { useSenderData, TableSender } from '@/hooks/useSenderData'

// Create a custom type for the selection count change handler
// that includes our viewInGmail extension
interface SelectionCountHandler {
  (count: number): void;
  viewInGmail?: () => void;
  getSelectedEmails?: (emails: string[], emailCounts?: Record<string, number>) => void;
}

export default function AnalysisView() {
  const [selectedCount, setSelectedCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
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
    startDelete,
    // progress: deleteProgress, // We might want delete-specific progress later
    // cancelDelete, // We might need a cancel button later
    // reauthModal, 
    // closeReauthModal
  } = useDelete()
  
  // Track selected emails for bulk actions
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
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

  const { senders } = useSenderData()

  // Wrapper function for setSelectedCount that keeps track of table actions
  const handleSelectedCountChange: SelectionCountHandler = useCallback((count: number) => {
    setSelectedCount(count);
    // When the SenderTable sets an action function on this method,
    // store it in our ref for later use
    if (handleSelectedCountChange.viewInGmail) {
      tableActionsRef.current.viewInGmail = handleSelectedCountChange.viewInGmail;
    }
  }, []);

  // Set up a side effect to receive selected emails from the table
  useEffect(() => {
    // @ts-ignore - Adding a method to the component instance
    handleSelectedCountChange.getSelectedEmails = (emails: string[], emailCounts?: Record<string, number>) => {
      setSelectedEmails(emails);
      
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
    if (selectedEmails.length === 0 && !activeSingleSender) {
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
    viewMultipleSendersInGmail(selectedEmails);
  }, [selectedEmails, viewMultipleSendersInGmail, activeSingleSender, viewSenderInGmail]);

  // Handler to initiate the delete flow - uses checkFeatureAccess
  const handleDelete = useCallback(() => {
    if (selectedEmails.length === 0) {
      toast.warning('No senders selected');
      return;
    }
    // checkFeatureAccess will open the premium modal if needed and set internal state
    if (checkFeatureAccess('delete', selectedEmails.length)) {
      // If access granted, proceed to open delete confirm modal
      setEmailsToDelete(selectedEmails);
      setIsDeleteModalOpen(true);
    }
    // No else needed, hook handles opening the premium modal
  }, [selectedEmails, checkFeatureAccess]);

  // Handler for when delete is actually confirmed
  const handleDeleteConfirm = useCallback(async () => {
    if (emailsToDelete.length === 0) return;
    
    const sendersToDeleteFormatted: SenderToDelete[] = emailsToDelete.map(email => ({
      email: email,
      count: emailCountMap[email] || 30
    }));
    
    const result = await startDelete(sendersToDeleteFormatted);
    
    if (result.success) {
      setSelectedEmails([]);
      setEmailsToDelete([]);
    } 
  }, [emailsToDelete, emailCountMap, startDelete]);
  
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
    // Check if user has premium access first
    if (checkFeatureAccess('delete_with_exceptions', emailsToDelete.length)) {
      console.log(`Delete with exceptions for ${emailsToDelete.length} senders`);
      // This would later be implemented with a different modal and logic
    }
  }, [emailsToDelete.length, checkFeatureAccess]);

  const handleMarkAllRead = () => {
    console.log(`Mark all emails from ${selectedCount} senders as read`);
  }

  const handleApplyLabel = () => {
    console.log(`Apply label to ${selectedCount} senders`);
  }

  const handleBlockSenders = () => {
    console.log(`Block ${selectedCount} senders`);
  }

  // --- NEW: Logic to disable bulk delete button ---
  const isBulkDeleteDisabled = useMemo(() => {
    // Rule 1: Always disabled if nothing is selected
    if (selectedCount === 0) {
      return true; 
    }
    
    // Rule 2: If one or more are selected, check if *all* of them have had delete taken
    
    // Find the sender data objects corresponding to the selected emails
    const selectedSenderDataList = senders.filter(sender => 
      selectedEmails.includes(sender.email)
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

  }, [selectedCount, selectedEmails, senders]); // Dependencies: count, emails, and the sender data itself

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
        onApplyLabel={handleApplyLabel}
        onBlockSenders={handleBlockSenders}
        onSearchChange={setSearchTerm}
      />

      {/* TABLE CONTAINER */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <SenderTable 
            onSelectedCountChange={handleSelectedCountChange} 
            searchTerm={searchTerm}
            onDeleteSingleSender={handleDeleteSingleSender}
          />
        </div>
      </div>

      <AnalysisFooter searchTerm={searchTerm} />
      
      {/* Delete Confirmation Modal (Local State) */}
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        emailCount={totalEmailCount}
        senderCount={emailsToDelete.length}
        onConfirm={handleDeleteConfirm} 
        senders={emailsToDelete}
        emailCountMap={emailCountMap}
        onDeleteWithExceptions={handleDeleteWithExceptions}
      />

      {/* Premium Feature Modal (State from Hook) */}
      <PremiumFeatureModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName={currentFeature || 'delete'}
        senderCount={itemCount}
        onViewInGmail={handleViewInGmail}
      />
    </div>
  )
}
