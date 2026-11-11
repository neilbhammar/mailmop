"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Archive } from "lucide-react"
import { useQueue } from "@/hooks/useQueue"
import { logger } from "@/lib/utils/logger"

interface ArchiveConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sender addresses to archive. */
  senders: string[]
  /** Called once the job is queued (not on cancel). */
  onSuccess?: () => void
}

/**
 * Confirms archiving every inbox email from the chosen senders, then queues it.
 *
 * There is no email count here on purpose: the analysis knows how many emails
 * each sender sent in total, not how many are still in the inbox, and a number
 * that overstates the change would be misleading. The finished toast gives the
 * real count.
 */
export function ArchiveConfirmModal({ open, onOpenChange, senders, onSuccess }: ArchiveConfirmModalProps) {
  const [isQueuing, setIsQueuing] = useState(false)
  const { enqueue } = useQueue()

  const senderCount = senders.length
  const title =
    senderCount === 1 ? "Archive emails from this sender" : `Archive emails from ${senderCount.toLocaleString()} senders`

  const handleConfirm = () => {
    if (senderCount === 0 || isQueuing) return
    setIsQueuing(true)
    try {
      enqueue("archive", { senders: senders.map(email => ({ email })) })
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      logger.error("Failed to queue archive", { component: "ArchiveConfirmModal", error })
    } finally {
      setIsQueuing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Archive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl font-semibold dark:text-slate-100">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 pt-2 text-left">
            Every email from {senderCount === 1 ? "this sender" : "these senders"} still in your inbox moves out of it.
            Nothing is deleted. They stay in All Mail, searchable, with their labels.
          </DialogDescription>
        </DialogHeader>

        {senderCount > 0 && (
          <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="p-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Senders</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {senderCount} {senderCount === 1 ? "sender" : "senders"}
              </span>
            </div>
            <div className="max-h-[110px] overflow-y-auto p-3 bg-white dark:bg-slate-800 space-y-2">
              {senders.map(sender => (
                <div key={sender} className="py-1 text-sm text-slate-700 dark:text-slate-300 truncate" title={sender}>
                  {sender}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 rounded-md">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            💡 New emails from {senderCount === 1 ? "this sender" : "these senders"} will still arrive in your inbox. To
            undo, open All Mail in Gmail and move them back to the inbox.
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
            disabled={isQueuing || senderCount === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white"
          >
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
