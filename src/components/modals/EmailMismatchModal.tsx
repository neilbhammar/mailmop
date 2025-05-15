import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { revokeAndClearToken } from '@/lib/gmail/token';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react"; // Using AlertTriangle for error
import { useState } from 'react'; // For loading state on button

interface EmailMismatchModalProps {
  isOpen: boolean; // Added to control dialog visibility
  onClose: () => void; // Added for closing the dialog
  supabaseEmail: string;
  gmailEmail: string;
}

export function EmailMismatchModal({
  isOpen,
  onClose,
  supabaseEmail,
  gmailEmail
}: EmailMismatchModalProps) {
  const { requestPermissions } = useGmailPermissions();
  const [isLoading, setIsLoading] = useState(false);

  const handleRetry = async () => {
    setIsLoading(true);
    try {
      await revokeAndClearToken(); // Clear the invalid token
      await requestPermissions(); // Try again, user will select account from chooser
      // Assuming requestPermissions will handle success/failure and closing the modal
      // or the parent component will react to auth state changes.
    } catch (error) {
      console.error("Error during retry:", error);
      // Potentially show a toast error here
    } finally {
      setIsLoading(false);
      onClose(); // Close modal after attempt
    }
  };

  // Prevent closing on overlay click when loading
  const handleOpenChange = (open: boolean) => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-b from-red-50 via-white to-red-50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 shadow-xl border-none p-0 overflow-hidden rounded-xl">
        <DialogHeader className="pt-8 px-6 md:px-8 pb-0 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-5 bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <DialogTitle className="text-2xl text-center font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Email Account Mismatch
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-gray-600 dark:text-slate-400 space-y-3 leading-relaxed mx-auto max-w-sm">
            <p>
              Oops! It looks like you signed into MailMop with <strong className="text-gray-700 dark:text-slate-200">{supabaseEmail}</strong>, but the Gmail account connected is <strong className="text-gray-700 dark:text-slate-200">{gmailEmail}</strong>.
            </p>
            <p className="text-gray-500 dark:text-slate-500">
              For MailMop to work its magic securely, please use the same email for both your MailMop account and the Gmail inbox you'd like to tidy up.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 md:p-8 mt-2">
          <Button
            onClick={handleRetry}
            disabled={isLoading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-850 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              `Reconnect as ${supabaseEmail}`
            )}
          </Button>
           <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full h-11 mt-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/70 rounded-lg transition-colors"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 