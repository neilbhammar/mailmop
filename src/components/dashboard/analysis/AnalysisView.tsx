"use client"

import { useState } from "react"
import { SenderTable } from "./SenderTable"
import { AnalysisHeader } from "./AnalysisHeader"
import { AnalysisFooter } from "./AnalysisFooter"
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'

export default function AnalysisView() {
  const [selectedCount, setSelectedCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const { progress } = useAnalysisOperations()

  // Handlers for bulk actions
  const handleViewInGmail = () => {
    console.log(`View ${selectedCount} senders in Gmail`)
  }

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
            onSelectedCountChange={setSelectedCount} 
            searchTerm={searchTerm}
          />
        </div>
      </div>

      <AnalysisFooter searchTerm={searchTerm} />
    </div>
  )
}
