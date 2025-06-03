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

interface ConfirmUnsubscribeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  senderEmail: string
  onConfirm: () => void // Called when user confirms sending the email
  onCancel?: () => void // Optional: Called when user explicitly cancels
}

const SESSION_STORAGE_KEY = "skipUnsubConfirm"

export function ConfirmUnsubscribeModal({
  open,
  onOpenChange,
  senderEmail,
  onConfirm,
  onCancel,
}: ConfirmUnsubscribeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // Effect to check session storage when modal is opened (or would be opened)
  // This is slightly different from the plan: the check should happen *before* deciding to show the modal.
  // For now, this modal will always be shown if `open` is true. The calling code will manage the session check.
  // This modal itself will just handle setting the session storage if "don't show again" is checked.

  const handleConfirm = () => {
    if (dontShowAgain) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true")
      } catch (error) {
        console.warn("Could not save to session storage:", error)
      }
    }
    onConfirm()
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