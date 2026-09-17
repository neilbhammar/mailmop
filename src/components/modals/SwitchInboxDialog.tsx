import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { inboxSwitchWarning } from '@/lib/connectedInbox'
import { logger } from '@/lib/utils/logger'

interface SwitchInboxDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Confirms handing MailMop over to a different Gmail account.
 *
 * The cost being confirmed is the analysis on this device, not anything in
 * Gmail, and the copy says so — "clear" next to an email tool reads as "delete
 * my mail" unless you rule it out explicitly.
 *
 * Nothing is actually cleared here or in `switchInbox`. The data survives until
 * a *different* mailbox is connected, so closing Google's popup without picking
 * an account leaves the user exactly where they were.
 */
export function SwitchInboxDialog({ open, onOpenChange }: SwitchInboxDialogProps) {
  const { connectedInbox, switchInbox } = useGmailPermissions()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleSwitch = async () => {
    setIsSwitching(true)
    try {
      await switchInbox()
    } catch (error) {
      // Closing the Google popup rejects — an ordinary "changed my mind", not a
      // failure worth shouting about. The user is disconnected but keeps their
      // data, and the pill now reads "Reconnect Gmail".
      logger.debug('Inbox switch did not complete', {
        component: 'SwitchInboxDialog',
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsSwitching(false)
      onOpenChange(false)
    }
  }

  // Always closable, including mid-flight. Gating this on `isSwitching` assumed
  // the Google flow always reports back; when it did not, the dialog disabled
  // the only controls that could have dismissed it and the user was stuck with
  // a modal over the whole app. A dialog should never be able to trap someone
  // because a third-party popup went quiet.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-800 p-6 gap-6 max-w-sm">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-xl dark:text-slate-100">Connect a different inbox</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-slate-400 text-sm leading-normal">
            {inboxSwitchWarning(connectedInbox)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 border-0"
          >
            {isSwitching ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSwitch}
            disabled={isSwitching}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white flex items-center gap-2"
          >
            {isSwitching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Waiting for Google...</span>
              </>
            ) : (
              'Choose account'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
