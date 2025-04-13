import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/context/AuthProvider'
import { toast } from 'sonner'
import { clearSenderAnalysis } from '@/lib/storage/senderAnalysis'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { signOut } = useAuth()

  const handleSignOutWithClear = async () => {
    localStorage.clear()
    sessionStorage.clear()
    await clearSenderAnalysis()
    await signOut()
    toast.success("Signed out successfully", {
      description: "Your local data has been cleared for security."
    })
    onOpenChange(false)
  }

  const handleSignOutOnly = async () => {
    await signOut()
    toast.success("Signed out successfully")
    onOpenChange(false)
  }

  const handleClearOnly = async () => {
    localStorage.clear()
    sessionStorage.clear()
    await clearSenderAnalysis()
    toast.success("Local data cleared", {
      description: "All browser data has been cleared while keeping you signed in."
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white p-6 gap-6 max-w-sm">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-xl">Sign Out</DialogTitle>
          <DialogDescription className="text-gray-600 text-sm leading-normal">
            Would you like to clear your local data while signing out? This is recommended if you're using a shared device.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSignOutWithClear}
            className="w-full bg-red-600 text-white hover:bg-red-700"
          >
            Sign Out & Clear Data
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOutOnly}
            className="w-full"
          >
            Sign Out Only
          </Button>
          
          {/* Development-only option */}
          <div className="pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handleClearOnly}
              className="w-full border-dashed border-yellow-500 text-yellow-600 hover:bg-yellow-50"
            >
              [DEV] Clear Data Only
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 