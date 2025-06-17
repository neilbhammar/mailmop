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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Trash } from "lucide-react"
import { useQueue } from "@/hooks/useQueue"
import { estimateRuntimeMs } from "@/lib/utils/estimateRuntime"

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
   * Optional mapping of email counts per sender
   */
  emailCountMap?: Record<string, number>
  /**
   * Optional function to handle delete with exceptions
   */
  onDeleteWithExceptions?: () => void
  /**
   * Optional callback when action is successfully confirmed (not cancelled)
   */
  onSuccess?: () => void
}

/**
 * A modal that confirms email deletion with the user
 * Shows the number of emails, senders, and a warning message
 * 
 * 🆕 Now integrated with the queue system!
 * When users confirm, the job is added to the queue and processed automatically.
 * Users can track progress in the ProcessQueue UI and cancel if needed.
 */
export function DeleteConfirmModal({
  open,
  onOpenChange,
  emailCount,
  senderCount,
  onConfirm, // Optional - for backward compatibility
  senders = [],
  emailCountMap = {},
  onDeleteWithExceptions,
  onSuccess
}: DeleteConfirmModalProps) {
  // Track loading state during deletion process
  const [isDeleting, setIsDeleting] = useState(false)
  
  // State for delete method selection
  const [deleteMethod, setDeleteMethod] = useState<'trash' | 'permanent'>('trash')
  
  // Get queue functions
  const { enqueue } = useQueue()
  
  // Format the title based on email count and method
  const title = deleteMethod === 'trash' 
    ? `Trash ${emailCount.toLocaleString()} emails?`
    : `Delete ${emailCount.toLocaleString()} emails?`
  
  // Handle the confirmation click
  const handleConfirm = async () => {
    if (onConfirm) {
      // Legacy path - use provided onConfirm function
      try {
        setIsDeleting(true)
        await onConfirm()
        // Call success callback before closing modal
        if (onSuccess) onSuccess();
        // Close modal after successful deletion
        onOpenChange(false)
      } catch (error) {
        console.error("Error during deletion:", error)
        // Modal will stay open if there's an error
      } finally {
        setIsDeleting(false)
      }
    } else {
      // New queue path - add job to queue
      try {
        setIsDeleting(true)
        
        // Convert senders to the format expected by the queue
        const sendersForQueue = senders.map(email => ({
          email,
          emailCount: getEmailCountForSender(email)
        }))
        
        if (deleteMethod === 'trash') {
          // Soft delete - apply TRASH label using modify label queue
          const initialEtaMs = estimateRuntimeMs({
            operationType: 'mark', // Label modification is similar to mark
            emailCount,
            mode: 'single'
          })
          
          // Add label modification job to queue to apply TRASH label
          enqueue('modifyLabel', {
            senders: sendersForQueue,
            labelIds: ['TRASH'],
            actionType: 'add',
            initialEtaMs
          })
        } else {
          // Permanent delete - use existing delete queue
          const initialEtaMs = estimateRuntimeMs({
            operationType: 'delete',
            emailCount,
            mode: 'single'
          })
          
          // Add job to queue
          enqueue('delete', {
            senders: sendersForQueue,
            initialEtaMs
          })
        }
        
        // Call success callback before closing modal
        if (onSuccess) onSuccess();
        // Close modal immediately - user can track progress in ProcessQueue
        onOpenChange(false)
      } catch (error) {
        console.error("Error adding job to queue:", error)
        // Modal will stay open if there's an error
      } finally {
        setIsDeleting(false)
      }
    }
  }
  
  // Get the email count for a sender, either from the map or divide evenly
  const getEmailCountForSender = (sender: string): number => {
    if (emailCountMap[sender]) {
      return emailCountMap[sender]
    }
    // Fallback to evenly distributed count
    const fallbackCount = Math.floor(emailCount / senders.length) || 0;
    console.log(`[DEBUG] getEmailCountForSender('${sender}') fallback: emailCount=${emailCount}, senders.length=${senders.length}, result=${fallbackCount}`);
    console.log('[DEBUG] emailCountMap state:', emailCountMap);
    return fallbackCount;
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
            <div className={`w-8 h-8 rounded-full ${deleteMethod === 'trash' ? 'bg-orange-100 dark:bg-orange-500/20' : 'bg-red-100 dark:bg-red-500/20'} flex items-center justify-center`}>
              {deleteMethod === 'trash' ? (
                <Trash className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              ) : (
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
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
                    <div className="flex flex-col flex-1 min-w-0 mr-4 max-w-[300px]">
                      <span 
                        className="text-sm text-slate-700 dark:text-slate-300 truncate block" 
                        title={sender}
                      >
                        {sender}
                      </span>
                    </div>
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                      {getEmailCountForSender(sender).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Delete Method Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Delete method:
            </label>
            
            <Select value={deleteMethod} onValueChange={(value: 'trash' | 'permanent') => setDeleteMethod(value)}>
              <SelectTrigger className="w-full bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
                <SelectItem value="trash" className="dark:text-slate-300 dark:hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Trash className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span>Move to Trash</span>
                  </div>
                </SelectItem>
                <SelectItem value="permanent" className="dark:text-slate-300 dark:hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span>Permanently Delete</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Warning/Info Message */}
          {deleteMethod === 'trash' ? (
            <div className="p-3 border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 rounded-md">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-orange-600 dark:text-orange-400 text-xs">ℹ</span>
                </div>
                <div>
                  <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                    Trash label will be applied - emails will auto-delete in 30 days. Gmail storage will not free up until deletion.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 rounded-md">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-red-600 dark:text-red-400 text-xs">⚠</span>
                </div>
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    This action cannot be undone. Emails will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
          )}
          
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
            className={deleteMethod === 'trash' 
              ? "bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-700 dark:hover:bg-orange-600 dark:text-orange-100"
              : "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600 dark:text-red-100"
            }
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="animate-pulse">{onConfirm ? (deleteMethod === 'trash' ? 'Moving to Trash' : 'Deleting') : 'Adding to Queue'}</span>
                <span className="animate-pulse ml-1">...</span>
              </>
            ) : (
              deleteMethod === 'trash' ? 'Move to Trash' : 'Permanently Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 