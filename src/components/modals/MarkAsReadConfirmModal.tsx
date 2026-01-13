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
import { useQueue } from "@/hooks/useQueue"
import { logger } from "@/lib/utils/logger"

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
   * 
   * NOTE: This is now optional since the modal can handle the job directly
   * via the queue system, but kept for backward compatibility
   */
  onConfirm?: () => Promise<void>
  /**
   * Optional array of sender emails to display
   */
  senders?: string[]
  /**
   * Optional mapping of unread email counts per sender
   */
  unreadCountMap?: Record<string, number>
  /**
   * Optional array of all senders for live data lookup
   */
  allSenders?: Array<{ email: string; unread_count?: number }>
  /**
   * Optional callback when action is successfully confirmed (not cancelled)
   */
  onSuccess?: () => void
}

/**
 * A modal that confirms marking emails as read with the user
 * Shows the number of unread emails and senders affected
 * 
 * 🆕 Now integrated with the queue system!
 * When users confirm, the job is added to the queue and processed automatically.
 * Users can track progress in the ProcessQueue UI and cancel if needed.
 */
export function MarkAsReadConfirmModal({
  open,
  onOpenChange,
  unreadCount,
  senderCount,
  onConfirm, // Optional - for backward compatibility
  senders = [],
  unreadCountMap = {},
  allSenders,
  onSuccess
}: MarkAsReadConfirmModalProps) {
  // Track loading state during the operation
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Get queue functions
  const { enqueue } = useQueue()
  
  // Check if this is a "mark all" operation (empty sender email)
  const isMarkAll = senders.length === 1 && senders[0] === '';

  // Format the title based on context
  const getTitle = () => {
    if (isMarkAll) {
      // Mark all unread emails case
      return 'Mark all unread emails as read'
    } else if (senderCount === 1) {
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
      
      // If there's a legacy onConfirm callback, use it (for backward compatibility)
      if (onConfirm) {
        logger.debug('Using legacy onConfirm callback', { component: 'MarkAsReadModal' })
        await onConfirm()
      } else {
        // 🚀 NEW QUEUE INTEGRATION
        logger.debug('Using queue system for Mark as Read', { component: 'MarkAsReadModal' })
        
        // Convert senders list to the format expected by the queue
        const sendersPayload = senders.map(senderEmail => ({
          email: senderEmail,
          unreadCount: getUnreadCountForSender(senderEmail)
        }))
        
        // Enqueue the Mark as Read job
        const jobId = enqueue('markRead', {
          senders: sendersPayload
        })
        
        logger.debug('Mark as Read job enqueued', { 
          component: 'MarkAsReadModal',
          jobId,
          senderCount: sendersPayload.length
        })
        
        // Show success message
        // Note: The actual completion toast will be shown by useMarkAsRead when the job finishes
      }
      
      // Call success callback before closing modal
      if (onSuccess) onSuccess();
      // Close the modal
      onOpenChange(false)
    } catch (error) {
      logger.error('Error marking as read', { component: 'MarkAsReadModal', error })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Get the unread count for a sender, defaulting to 0
  const getUnreadCountForSender = (sender: string): number => {
    if (allSenders && allSenders.length > 0) {
      const senderData = allSenders.find(s => s.email === sender);
      return senderData?.unread_count || 0;
    }
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
      <DialogContent className="max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <MailOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl font-semibold dark:text-slate-100">
              {getTitle()}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {!isMarkAll && senders.length > 0 && (
            <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="p-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Senders</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{senderCount} {senderCount === 1 ? 'sender' : 'senders'}</span>
                </div>
              </div>
              <div className="max-h-[110px] overflow-y-auto p-3 bg-white dark:bg-slate-800">
                <div className="space-y-2">
                  {sortedSenders.map(sender => {
                    const unreadCount = getUnreadCountForSender(sender)
                    return (
                      <div
                        key={sender}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex flex-col flex-1 min-w-0 mr-4 max-w-[300px]">
                          <span
                            className="text-sm text-slate-700 dark:text-slate-300 truncate block"
                            title={sender}
                          >
                            {sender}
                          </span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
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

          {isMarkAll && (
            <div className="p-3 border border-slate-200 dark:border-slate-600 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                This will mark <strong>all unread emails</strong> in your inbox as read, regardless of sender.
              </p>
            </div>
          )}
          
          <div className="p-3 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 rounded-md">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              💡 You can undo this later by marking emails as unread in Gmail
            </p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mr-2 bg-white dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="animate-pulse">Adding to Queue</span>
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