"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { MailWarning } from "lucide-react"
import { useState, useEffect } from "react"

// --- Queue Integration ---
import { useQueue } from "@/hooks/useQueue"
import { estimateRuntimeMs } from "@/lib/utils/estimateRuntime"

interface ConfirmUnsubscribeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  senderEmail: string
  methodDetails: {
    type: "url" | "mailto";
    value: string; 
    requiresPost?: boolean;
  }
  onConfirm?: () => void // Optional: Called when user confirms sending the email (legacy support)
  onCancel?: () => void // Optional: Called when user explicitly cancels
}

const SESSION_STORAGE_KEY = "skipUnsubConfirm"

export function ConfirmUnsubscribeModal({
  open,
  onOpenChange,
  senderEmail,
  methodDetails,
  onConfirm,
  onCancel,
}: ConfirmUnsubscribeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const { enqueue } = useQueue()

  // Check if this is an EMAIL-based operation that should use the queue
  const isEmailOperation = methodDetails.type === "mailto" && !methodDetails.requiresPost

  const handleConfirm = () => {
    if (dontShowAgain) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true")
      } catch (error) {
        console.warn("Could not save to session storage:", error)
      }
    }

    // Use queue for EMAIL-based operations, legacy path for others
    if (isEmailOperation) {
      // Calculate initial ETA for unsubscribe operation
      const unsubscribeEtaMs = estimateRuntimeMs({
        operationType: 'mark', // Similar complexity to marking
        emailCount: 1, // Unsubscribe is a single operation
        mode: 'single'
      })

      // Add unsubscribe job to queue
      enqueue('unsubscribe', {
        senderEmail,
        methodDetails,
        initialEtaMs: unsubscribeEtaMs
      })
    } else {
      // Legacy path for URL-based or POST operations
      onConfirm?.()
    }

    onOpenChange(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center dark:text-slate-100">
            <MailWarning className="h-5 w-5 mr-2 text-orange-500 dark:text-orange-400" />
            Confirm Unsubscribe
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2 dark:text-slate-400">
            This will send an unsubscribe email from your Gmail account to{" "}
            <strong className="text-gray-700 dark:text-slate-300">{senderEmail}</strong>.
            <br />
            Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again-unsubscribe"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(Boolean(checked))}
              className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 dark:data-[state=checked]:bg-orange-500 dark:data-[state=checked]:border-orange-500 border-slate-300 dark:border-slate-600"
            />
            <Label
              htmlFor="dont-show-again-unsubscribe"
              className="text-sm font-normal text-gray-600 dark:text-slate-400 cursor-pointer"
            >
              Don&apos;t ask me again this session for mailto unsubscribes.
            </Label>
          </div>
        </div>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleCancel} size="sm" className="dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleConfirm} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-500 dark:text-white">
              Send Email
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 