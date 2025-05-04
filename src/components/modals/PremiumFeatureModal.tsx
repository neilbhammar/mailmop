"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Star, Check, X } from "lucide-react"

interface PremiumFeatureModalProps {
  /**
   * Whether the modal is currently open
   */
  open: boolean
  /**
   * Function to call when the modal is closed
   */
  onOpenChange: (open: boolean) => void
  /**
   * The feature name being accessed
   */
  featureName: string
  /**
   * Function to call when user wants to view in Gmail instead
   */
  onViewInGmail: () => void
  /**
   * Number of selected senders (for messaging)
   */
  senderCount: number
}

/**
 * Premium feature modal that displays upgrade messaging
 * and provides alternatives like View in Gmail
 */
export function PremiumFeatureModal({
  open,
  onOpenChange,
  featureName,
  onViewInGmail,
  senderCount
}: PremiumFeatureModalProps) {
  // Format feature name for display
  const formattedFeatureName = featureName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    
  // Handle view in Gmail and close modal
  const handleViewInGmail = () => {
    onOpenChange(false)
    onViewInGmail()
  }
  
  // Handle close modal
  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 rounded-lg overflow-hidden bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Premium Features</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row">
          {/* Left side - purple background with illustration */}
          <div className="bg-indigo-600 p-8 flex flex-col justify-center items-center md:w-1/2 relative">
            <button 
              onClick={handleClose}
              className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                <span className="block">Unlock the</span>
                <span className="text-teal-300">full power</span>
                <span className="block">of MailMop</span>
              </h2>
              
              <p className="text-white/90 mt-4 max-w-sm mx-auto">
                Unlock advanced email management. Boost your productivity, streamline your 
                inbox, and experience the future of email efficiency today.
              </p>
            </div>
            
            {/* Illustration - simplified box representation */}
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 bg-indigo-800 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-5xl">∞</div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 h-16 w-16 bg-red-400 rounded-lg"></div>
                <div className="absolute bottom-0 left-0 h-16 w-16 bg-teal-300 rounded-lg"></div>
                <div className="absolute top-20 -left-4 h-12 w-12 bg-amber-400 rounded-lg"></div>
                <div className="absolute bottom-16 -right-8 h-10 w-10 bg-sky-400 rounded-lg"></div>
              </div>
            </div>
          </div>
          
          {/* Right side - white background with features */}
          <div className="bg-white p-8 md:w-1/2 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                <h3 className="text-xl font-semibold">Unlock premium features</h3>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>One-click delete across your entire inbox</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Bulk actions for faster cleanup</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Smart filters and recommendations</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Advanced analytics and insights</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Automatic sender categorization</span>
                </li>
              </ul>
              
              <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-700 mb-6">
                <p>
                <span className="font-medium">Tip:</span> You can still delete or modify emails from {senderCount > 1 ? 'these senders' : 'this sender'}  directly in Gmail without upgrading.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12"
                onClick={() => window.location.href = '/dashboard/upgrade'}
              >
                See pricing
              </Button>
              
              <Button
                variant="outline"
                onClick={handleViewInGmail}
                className="w-full text-slate-700 border-slate-300 hover:bg-slate-50 h-12"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Gmail
              </Button>
              
              <p className="text-center text-xs text-slate-500">
                Some plans don't include all features. Review and upgrade to the plan that best fits your needs.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 