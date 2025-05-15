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
import { Trash2 } from "lucide-react"

interface DeleteConfirmModalProps {
  /**
   * Whether the modal is currently open
   */
  open: boolean
  /**
   * Function to call when the modal is closed
   */
  onOpenChange: (open: boolean) => void
  /**
   * The total number of emails to be deleted
   */
  emailCount: number
  /**
   * The number of unique senders these emails are from
   */
  senderCount: number
  /**
   * Function to call when deletion is confirmed
   */
  onConfirm: () => Promise<void>
  /**
   * Optional array of sender emails to display
   */
  senders?: string[]
  /**
   * Optional mapping of email counts per sender
   */
  emailCountMap?: Record<string, number>
  /**
   * Optional function to handle delete with exceptions
   */
  onDeleteWithExceptions?: () => void
}

/**
 * A modal that confirms email deletion with the user
 * Shows the number of emails, senders, and a warning message
 */
export function DeleteConfirmModal({
  open,
  onOpenChange,
  emailCount,
  senderCount,
  onConfirm,
  senders = [],
  emailCountMap = {},
  onDeleteWithExceptions
}: DeleteConfirmModalProps) {
  // Track loading state during deletion process
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Format the title based on email count
  const title = `Delete ${emailCount.toLocaleString()} emails?`
  
  // Handle the confirmation click
  const handleConfirm = async () => {
    try {
      setIsDeleting(true)
      await onConfirm()
      // Close modal after successful deletion
      onOpenChange(false)
    } catch (error) {
      console.error("Error during deletion:", error)
      // Modal will stay open if there's an error
    } finally {
      setIsDeleting(false)
    }
  }
  
  // Get the email count for a sender, either from the map or divide evenly
  const getEmailCountForSender = (sender: string): number => {
    if (emailCountMap[sender]) {
      return emailCountMap[sender]
    }
    // Fallback to evenly distributed count
    return Math.floor(emailCount / senders.length) || 0
  }
  
  // Handle delete with exceptions click
  const handleDeleteWithExceptions = () => {
    onOpenChange(false)
    if (onDeleteWithExceptions) {
      onDeleteWithExceptions()
    }
  }
  
  // Sort senders by email count (highest first)
  const sortedSenders = [...senders].sort((a, b) => {
    const countA = getEmailCountForSender(a)
    const countB = getEmailCountForSender(b)
    return countB - countA
  })
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl font-semibold dark:text-slate-100">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="p-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Senders</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{senderCount} {senderCount === 1 ? 'sender' : 'senders'}</span>
              </div>
            </div>
            <div className="max-h-[110px] overflow-y-auto p-3 bg-white dark:bg-slate-800">
              <div className="space-y-2">
                {sortedSenders.map(sender => (
                  <div 
                    key={sender} 
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex flex-col flex-1 min-w-0 mr-4">
                      <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{sender}</span>
                    </div>
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                      {getEmailCountForSender(sender).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-3 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              Warning: This action is permanent
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              All {emailCount.toLocaleString()} emails will be permanently deleted and cannot be recovered.
            </p>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Want more granular control? Try{' '}
            <button 
              onClick={handleDeleteWithExceptions}
              className="border-b border-dotted border-slate-500 dark:border-slate-500 hover:border-slate-900 dark:hover:border-slate-300"
            >
              Delete With Exceptions
            </button>
          </p>
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
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600 dark:text-red-100"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="animate-pulse">Deleting</span>
                <span className="animate-pulse ml-1">...</span>
              </>
            ) : (
              'Permanently Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 