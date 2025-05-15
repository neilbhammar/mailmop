import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { RefreshCw, ShieldAlert, Clock } from 'lucide-react'
import { toast } from 'sonner'
import React from 'react'
import { cn } from "@/lib/utils"

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
  const [isLoading, setIsLoading] = React.useState(false)

  const handleReauth = async () => {
    try {
      setIsLoading(true)
      const success = await requestPermissions()
      if (success) {
        toast.success("Successfully reconnected", {
          description: "You're all set to continue using MailMop"
        })
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to reconnect Gmail:', error)
      toast.error("Connection failed", {
        description: "Please try again or contact our support team"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const isExpired = type === 'expired'

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange} modal>
      <DialogContent className="max-w-lg bg-gradient-to-b from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 shadow-xl border-none p-0 overflow-hidden rounded-xl">
        <DialogHeader className="pt-8 px-8 pb-0">
          <DialogTitle className="sr-only">
            {isExpired 
              ? 'Gmail Connection Expired'
              : 'Gmail Connection Expiring Soon'
            }
          </DialogTitle>
          <div className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-6 transition-all duration-500",
            isExpired ? "bg-red-100 dark:bg-red-500/20" : "bg-amber-100 dark:bg-amber-500/20"
          )}>
            {isExpired ? (
              <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
            ) : (
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          
          <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-slate-100 mb-2">
            {isExpired 
              ? 'Gmail Connection Expired'
              : 'Gmail Connection Expiring Soon'
            }
          </h2>
          
          <p className="text-gray-600 dark:text-slate-400 text-center mb-3">
            {isExpired 
              ? 'Your connection to Gmail has timed out for security reasons'
              : `This operation will take approximately ${eta || 'some time'}`
            }
          </p>
          
          <p className="text-gray-500 dark:text-slate-500 text-center">
            {isExpired 
              ? 'Reconnect now to continue cleaning up your inbox'
              : 'To ensure uninterrupted service, please reconnect now'
            }
          </p>
        </DialogHeader>

        <div className="p-8 mt-2">
          <div className="space-y-4">
            <Button
              onClick={handleReauth}
              disabled={isLoading}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow border border-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-500 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
                    <path d="M3.15295 7.3455L6.43845 9.755C7.32745 7.554 9.48045 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15895 2 4.82795 4.1685 3.15295 7.3455Z" fill="#FF3D00"/>
                    <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3037 18.001 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z" fill="#4CAF50"/>
                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.784L18.7045 19.403C18.4855 19.6015 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
                  </svg>
                  Reconnect with Google
                </>
              )}
            </Button>
            
            {!isLoading && (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full h-12 border-none hover:bg-gray-100 dark:hover:bg-slate-700/70 dark:text-slate-300 text-gray-700 font-medium rounded-xl transition-all"
              >
                Cancel
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <div className="w-4 h-4">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="dark:hidden">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#E8F5E9"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M10.9984 13.9L7.79844 10.7C7.40844 10.31 6.77844 10.31 6.38844 10.7C5.99844 11.09 5.99844 11.72 6.38844 12.11L10.2884 16.01C10.6784 16.4 11.3284 16.4 11.7184 16.01L17.6184 10.11C18.0084 9.72 18.0084 9.09 17.6184 8.7C17.2284 8.31 16.5984 8.31 16.2084 8.7L10.9984 13.9Z" fill="#4CAF50"/>
              </svg>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden dark:block">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#2E7D32"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M10.9984 13.9L7.79844 10.7C7.40844 10.31 6.77844 10.31 6.38844 10.7C5.99844 11.09 5.99844 11.72 6.38844 12.11L10.2884 16.01C10.6784 16.4 11.3284 16.4 11.7184 16.01L17.6184 10.11C18.0084 9.72 18.0084 9.09 17.6184 8.7C17.2284 8.31 16.5984 8.31 16.2084 8.7L10.9984 13.9Z" fill="#A5D6A7"/>
              </svg>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500">
              MailMop only uses read-only access to analyze your inbox
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 