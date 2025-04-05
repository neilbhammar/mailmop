import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'

interface RevokeAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RevokeAccessDialog({ open, onOpenChange }: RevokeAccessDialogProps) {
  const { clearToken } = useGmailPermissions()

  const handleRevoke = () => {
    clearToken()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white p-6 gap-6 max-w-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-xl">Revoke Gmail Access</DialogTitle>
          <DialogDescription className="text-gray-600 text-sm leading-normal">
            Revoking access means you won't be able to run analysis or use actions that interact with your inbox. You'll still be able to see old sender that are stored in your browser.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-gray-100 hover:bg-gray-200 border-0"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            className="bg-white border border-red-600 text-red-600 hover:bg-red-50"
          >
            Revoke Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 