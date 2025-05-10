"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MailOpen } from "lucide-react"

interface MarkAsReadConfirmModalProps {
  /**
   * Whether the modal is currently open
   */
  open: boolean
  /**
   * Function to call when the modal is closed
   */
  onOpenChange: (open: boolean) => void
  /**
   * The total number of unread emails to be marked
   */
  unreadCount: number
  /**
   * The number of unique senders these emails are from
   */
  senderCount: number
  /**
   * Function to call when marking is confirmed
   */
  onConfirm: () => Promise<void>
  /**
   * Optional array of sender emails to display
   */
  senders?: string[]
  /**
   * Optional mapping of unread email counts per sender
   */
  unreadCountMap?: Record<string, number>
}

/**
 * A modal that confirms marking emails as read with the user
 * Shows the number of unread emails and senders affected
 */
export function MarkAsReadConfirmModal({
  open,
  onOpenChange,
  unreadCount,
  senderCount,
  onConfirm,
  senders = [],
  unreadCountMap = {},
}: MarkAsReadConfirmModalProps) {
  // Track loading state during the operation
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Format the title based on context
  const getTitle = () => {
    if (senderCount === 1) {
      // Single sender case
      return unreadCount > 0 
        ? `Mark ${unreadCount.toLocaleString()} emails as read`
        : 'Mark emails from 1 sender as read'
    } else {
      // Multiple senders case
      return unreadCount > 0
        ? `Mark ${unreadCount.toLocaleString()} emails as read`
        : `Mark emails from ${senderCount} senders as read`
    }
  }
  
  // Handle the confirmation click
  const handleConfirm = async () => {
    try {
      setIsProcessing(true)
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error("Error marking as read:", error)
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Get the unread count for a sender, defaulting to 0
  const getUnreadCountForSender = (sender: string): number => {
    return unreadCountMap[sender] || 0
  }
  
  // Sort senders by unread count (highest first)
  const sortedSenders = [...senders].sort((a, b) => {
    const countA = getUnreadCountForSender(a)
    const countB = getUnreadCountForSender(b)
    return countB - countA
  })
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border border-slate-200 shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <MailOpen className="h-4 w-4 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              {getTitle()}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {senders.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="p-3 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Selected Senders</span>
                  <span className="text-xs text-slate-500">{senderCount} {senderCount === 1 ? 'sender' : 'senders'}</span>
                </div>
              </div>
              <div className="max-h-[110px] overflow-y-auto p-3 bg-white">
                <div className="space-y-2">
                  {sortedSenders.map(sender => {
                    const unreadCount = getUnreadCountForSender(sender)
                    return (
                      <div 
                        key={sender} 
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex flex-col flex-1 min-w-0 mr-4">
                          <span className="text-sm text-slate-700 truncate">{sender}</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="text-sm text-blue-600 font-medium whitespace-nowrap">
                            {unreadCount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          
          <div className="p-3 border border-blue-200 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700 font-medium">
              You can undo this later by marking emails as unread in Gmail
            </p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mr-2 bg-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="animate-pulse">Processing</span>
                <span className="animate-pulse ml-1">...</span>
              </>
            ) : (
              'Mark as Read'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 