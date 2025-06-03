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
import { clearAllUserData } from '@/lib/storage/userStorage'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { signOut } = useAuth()

  const handleSignOutWithClear = async () => {
    try {
      // Clear all data first
      await clearAllUserData()
      
      // Then sign out
      await signOut()
      
      toast.success("Signed out successfully", {
        description: "Your local data has been cleared for security."
      })
    } catch (error) {
      console.error('[SignOut] Error:', error)
      toast.error("Error signing out", {
        description: "Please try again or contact support if the problem persists."
      })
    } finally {
      onOpenChange(false)
    }
  }

  const handleSignOutPreserve = async () => {
    try {
      // Just sign out, preserve data
      await signOut()
      
      toast.success("Signed out successfully", {
        description: "Your local data has been preserved for your next sign in."
      })
    } catch (error) {
      console.error('[SignOut] Error:', error)
      toast.error("Error signing out", {
        description: "Please try again or contact support if the problem persists."
      })
    } finally {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-800 p-6 gap-6 max-w-sm">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-xl dark:text-slate-100">Sign Out</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-slate-400 text-sm leading-normal">
            Choose how to handle your local data when signing out. Clearing data is recommended on shared devices.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSignOutWithClear}
            className="w-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            Sign Out & Clear Data
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOutPreserve}
            className="w-full dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            Sign Out & Preserve Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 