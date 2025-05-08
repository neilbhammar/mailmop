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
import { revokeAndClearToken } from '@/lib/gmail/token'

// Set this to true to see testing buttons
const testing = false;

interface RevokeAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RevokeAccessDialog({ open, onOpenChange }: RevokeAccessDialogProps) {
  const handleRevoke = async () => {
    await revokeAndClearToken()
    onOpenChange(false)
  }

  // TODO: Implement these functions in GmailPermissionsProvider or token.ts
  const { clearAccessTokenOnly, expireAccessToken } = useGmailPermissions();

  const handleClearAccessToken = async () => {
    if (clearAccessTokenOnly) {
      await clearAccessTokenOnly();
      // Optionally add some user feedback, e.g., a toast message
      console.log("Access token cleared (testing only)");
    }
    // onOpenChange(false); // Decide if dialog should close
  };

  const handleExpireAccessToken = async () => {
    if (expireAccessToken) {
      await expireAccessToken();
      // Optionally add some user feedback
      console.log("Access token set to expire in 1 min (testing only)");
    }
    // onOpenChange(false); // Decide if dialog should close
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white p-6 gap-6 max-w-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-xl">Revoke Gmail Access</DialogTitle>
          <DialogDescription className="text-gray-600 text-sm leading-normal">
            This will remove MailMop's access to your Gmail account. You'll need to reconnect to continue using MailMop.
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
          {testing && (
            <>
              <Button
                variant="outline"
                onClick={handleClearAccessToken}
                className="bg-yellow-100 hover:bg-yellow-200 border-yellow-500 text-yellow-700"
              >
                Clear Access Token Only (Test)
              </Button>
              <Button
                variant="outline"
                onClick={handleExpireAccessToken}
                className="bg-orange-100 hover:bg-orange-200 border-orange-500 text-orange-700"
              >
                Expire Access Token (Test)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 