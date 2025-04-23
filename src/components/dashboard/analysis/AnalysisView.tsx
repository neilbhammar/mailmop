"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { SenderTable } from "./SenderTable"
import { AnalysisHeader } from "./AnalysisHeader"
import { AnalysisFooter } from "./AnalysisFooter"
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'
import { useViewInGmail } from '@/hooks/useViewInGmail'

// Create a custom type for the selection count change handler
// that includes our viewInGmail extension
interface SelectionCountHandler {
  (count: number): void;
  viewInGmail?: () => void;
}

export default function AnalysisView() {
  const [selectedCount, setSelectedCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const { progress } = useAnalysisOperations()
  const { viewMultipleSendersInGmail } = useViewInGmail();
  
  // Track selected emails for bulk actions
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  
  // Use a ref to store the viewInGmail function exposed by SenderTable
  const tableActionsRef = useRef<{
    viewInGmail?: () => void;
  }>({});

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
    handleSelectedCountChange.getSelectedEmails = (emails: string[]) => {
      setSelectedEmails(emails);
    };
  }, []);

  // Handlers for bulk actions
  const handleViewInGmail = useCallback(() => {
    // Use the direct hook approach for bulk view
    viewMultipleSendersInGmail(selectedEmails);
  }, [selectedEmails, viewMultipleSendersInGmail]);

  const handleDelete = () => {
    console.log(`Delete emails from ${selectedCount} senders`)
  }

  const handleMarkAllRead = () => {
    console.log(`Mark all emails from ${selectedCount} senders as read`)
  }

  const handleDeleteWithExceptions = () => {
    console.log(`Delete with exceptions for ${selectedCount} senders`)
  }

  const handleApplyLabel = () => {
    console.log(`Apply label to ${selectedCount} senders`)
  }

  const handleBlockSenders = () => {
    console.log(`Block ${selectedCount} senders`)
  }

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
          />
        </div>
      </div>

      <AnalysisFooter searchTerm={searchTerm} />
    </div>
  )
}
