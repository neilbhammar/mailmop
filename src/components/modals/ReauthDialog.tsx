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
import { RefreshCcw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import React from 'react'

interface ReauthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'expired' | 'will_expire_during_operation'
  eta?: string // Only needed for will_expire_during_operation
}

export function ReauthDialog({ 
  open, 
  onOpenChange, 
  type,
  eta 
}: ReauthDialogProps) {
  const { requestPermissions } = useGmailPermissions()

  // Add debug logging
  React.useEffect(() => {
    console.log('ReauthDialog mounted with props:', { open, type, eta });
  }, [open, type, eta]);

  const handleReauth = async () => {
    try {
      const success = await requestPermissions()
      if (success) {
        toast.success("Gmail reconnected successfully", {
          description: "You can now continue with your operation."
        })
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to reconnect Gmail:', error)
      toast.error("Failed to reconnect Gmail", {
        description: "Please try again or contact support if the problem persists."
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="bg-white p-6 gap-6 max-w-sm fixed z-50">
        <DialogHeader className="gap-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            {type === 'expired' ? (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            ) : (
              <RefreshCcw className="h-6 w-6 text-amber-600" />
            )}
          </div>
          <DialogTitle className="text-xl text-center">
            {type === 'expired' 
              ? 'Gmail Session Expired'
              : 'Gmail Session Will Expire'
            }
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-sm leading-normal text-center">
            {type === 'expired' ? (
              'Your Gmail session has expired. Please reconnect to continue using MailMop.'
            ) : (
              `This operation will take ${eta}. To ensure it completes without interruption, please reconnect your Gmail account now.`
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleReauth}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Reconnect Gmail
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 