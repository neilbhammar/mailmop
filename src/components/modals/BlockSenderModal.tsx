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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Ban } from "lucide-react"
import { cn } from "@/lib/utils"

// --- Hooks ---
import { useCreateFilter } from "@/hooks/useCreateFilter"
import { useDelete } from "@/hooks/useDelete"

interface BlockSenderModalProps {
  /**
   * Whether the modal is currently open
   */
  open: boolean
  /**
   * Function to call when the modal is closed
   */
  onOpenChange: (open: boolean) => void
  /**
   * The total number of emails to be affected
   */
  emailCount: number
  /**
   * The number of unique senders to block
   */
  senderCount: number
  /**
   * Array of sender emails to block
   */
  senders?: string[]
  /**
   * Mapping of email counts per sender
   */
  emailCountMap?: Record<string, number>
  /**
   * Function to call when blocking is confirmed
   */
  onConfirm: () => Promise<void>
}

/**
 * A modal that confirms sender blocking with the user
 * Shows the number of senders, emails, and options for handling historical emails
 */
export function BlockSenderModal({
  open,
  onOpenChange,
  emailCount,
  senderCount,
  senders = [],
  emailCountMap = {},
  onConfirm
}: BlockSenderModalProps) {
  // Track loading state during the blocking process
  const [isProcessing, setIsProcessing] = useState(false)
  
  // State for the delete historical emails checkbox
  const [deleteHistoricalEmails, setDeleteHistoricalEmails] = useState(false)
  
  // Get the hooks we need
  const { startCreateFilter } = useCreateFilter()
  const { startDelete } = useDelete()
  
  // Get the email count for a sender
  const getEmailCountForSender = (sender: string): number => {
    return emailCountMap[sender] || 0
  }
  
  // Sort senders by email count (highest first)
  const sortedSenders = [...senders].sort((a, b) => {
    const countA = getEmailCountForSender(a)
    const countB = getEmailCountForSender(b)
    return countB - countA
  })
  
  // Handle the confirmation click
  const handleConfirm = async () => {
    try {
      setIsProcessing(true)
      
      // First create the filter to send future emails to trash
      await startCreateFilter({
        senders: senders,
        labelIds: ['TRASH'],
        actionType: 'add',
      })
      
      // If user chose to delete historical emails, do that too
      if (deleteHistoricalEmails) {
        await startDelete(
          senders.map(email => ({
            email,
            count: getEmailCountForSender(email)
          }))
        )
      }
      
      // Call the onConfirm callback
      await onConfirm()
      
      // Close modal after successful blocking
      onOpenChange(false)
    } catch (error) {
      console.error("Error during blocking:", error)
      // Modal will stay open if there's an error
    } finally {
      setIsProcessing(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border border-slate-200 shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <Ban className="h-4 w-4 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Block {senderCount} {senderCount === 1 ? 'Sender' : 'Senders'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Senders List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 border-b bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Selected Senders</span>
                <span className="text-xs text-slate-500">{senderCount} {senderCount === 1 ? 'sender' : 'senders'}</span>
              </div>
            </div>
            <div className="max-h-[110px] overflow-y-auto p-3 bg-white">
              <div className="space-y-2">
                {sortedSenders.map(sender => (
                  <div 
                    key={sender} 
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex flex-col flex-1 min-w-0 mr-4">
                      <span className="text-sm text-slate-700 truncate">{sender}</span>
                    </div>
                    <span className="text-sm text-blue-600 font-medium whitespace-nowrap">
                      {getEmailCountForSender(sender).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Info Box */}
          <div className="p-3 border border-slate-200 bg-slate-50 rounded-md">
            <p className="text-sm text-slate-700">
              Blocking these senders will:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                • Create a filter that automatically sends their future emails to Trash
              </li>
              <li className="flex items-center gap-2">
                • Trash will automatically clear these emails after 30 days
              </li>
            </ul>
          </div>
          
          {/* Delete Historical Emails Option */}
          <div className="flex items-start space-x-2 py-1">
            <div className="flex h-5 items-center">
              <Checkbox 
                id="delete-historical" 
                checked={deleteHistoricalEmails} 
                onCheckedChange={(checked) => setDeleteHistoricalEmails(checked as boolean)}
                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 border-slate-300"
              />
            </div>
            <div>
              <Label 
                htmlFor="delete-historical" 
                className="text-sm font-medium text-slate-700 leading-tight cursor-pointer"
              >
                Also delete historical emails
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Permanently delete all {emailCount > 0 ? emailCount.toLocaleString() : 'existing'} emails from {senderCount === 1 ? 'this sender' : 'these senders'}
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mr-2 bg-white"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="animate-pulse">Processing</span>
                <span className="animate-pulse ml-1">...</span>
              </>
            ) : (
              'Block Sender' + (senderCount > 1 ? 's' : '')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 