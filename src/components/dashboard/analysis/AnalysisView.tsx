"use client"

import { useState } from "react"
import { SenderTable } from "./SenderTable"
import { AnalysisHeader } from "./AnalysisHeader"
import { AnalysisFooter } from "./AnalysisFooter"

export default function AnalysisView() {
  const [selectedCount, setSelectedCount] = useState(0)

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
      />

      {/* TABLE CONTAINER */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <SenderTable onSelectedCountChange={setSelectedCount} />
        </div>
      </div>

      <AnalysisFooter />
    </div>
  )
}
