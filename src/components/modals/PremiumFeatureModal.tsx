"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { ExternalLink, X, Trash2, BellOff, MailOpen, Ban, Tag, FilterIcon, Sparkles, Rocket, PencilOff, Loader2 } from "lucide-react"
import { useStripeCheckout } from "@/hooks/useStripeCheckout"
import { useState, useEffect } from "react"
import { ManageSubscriptionModal } from "@/components/modals/ManageSubscriptionModal"
import { usePremiumModalTracking } from "@/hooks/usePremiumModalTracking"

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
   * The feature name being accessed.
   * To display a specific icon, this name should (case-insensitively) match one of the internal feature keys:
   * - "delete" (shows Trash2 icon)
   * - "block_sender" (shows Ban icon) - Note: uses underscore
   * - "unsubscribe" (shows BellOff icon)
   * - "mark_read" (shows MailOpen icon) - Note: uses underscore
   * - "apply_label" (shows Tag icon) - Note: uses underscore
   * - "delete_with_exceptions" (shows PencilOff icon) - Note: uses underscore, icon changed
   * Otherwise, a default Sparkles icon will be shown.
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
  const { redirectToCheckout, isLoading: isCheckoutLoading } = useStripeCheckout()
  const [showManageSubscriptionModal, setShowManageSubscriptionModal] = useState(false)
  const [showSubscriptionConfetti, setShowSubscriptionConfetti] = useState(false)
  const { trackPremiumModalOpen, trackPremiumModalClose } = usePremiumModalTracking()

  // Track when modal opens
  useEffect(() => {
    if (open) {
      trackPremiumModalOpen(featureName)
    }
  }, [open, featureName, trackPremiumModalOpen])

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
    trackPremiumModalClose(featureName, false) // Track close without upgrade
    onOpenChange(false)
  }

  const handleUpgrade = async () => {
    // Don't close modal immediately - wait for checkout to complete
    await redirectToCheckout(() => {
      // This callback runs when checkout is successful
      console.log('[PremiumFeatureModal] Checkout success received, closing this modal and showing subscription modal');
      trackPremiumModalClose(featureName, true); // Track close with upgrade
      onOpenChange(false); // Close the premium feature modal
      setShowSubscriptionConfetti(true);
      setShowManageSubscriptionModal(true);
      // Stop confetti after 5 seconds
      setTimeout(() => setShowSubscriptionConfetti(false), 5000);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* Modal background gradient applied, dot pattern div removed */}
        <DialogContent className="sm:max-w-2xl p-8 md:p-10 rounded-xl overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
          {/* Accessible Title and Description (Visually Hidden) */}
          <DialogHeader>
            <DialogTitle className="sr-only">Upgrade to MailMop Premium to Use {formattedFeatureName}</DialogTitle>
            <DialogDescription className="sr-only">
              Instantly unlock {formattedFeatureName} and our full suite of one-click actions to save hundreds of hours. Cheaper than a donut.
            </DialogDescription>
          </DialogHeader>
          
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute right-4 top-4 z-50 bg-white/70 backdrop-blur-sm rounded-full p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white transition-colors border border-gray-200 dark:border-slate-600 dark:bg-slate-700/70 dark:backdrop-blur-sm dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-600 shadow-sm"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          
          {/* Main Title - Icon removed, "Use" capitalized */}
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2 mt-6 flex items-center justify-center">
            Upgrade to Use {formattedFeatureName}
          </h2>

          {/* Subtitle/Description - Wider max-width */}
          <p className="text-gray-600 dark:text-slate-400 text-base md:text-lg mb-8 max-w-lg">
            Instantly unlock <strong>{formattedFeatureName}</strong> and our full suite of one-click actions to save hundreds of hours. Cheaper than a donut.
          </p>

          {/* Visual Showcase: Removed 'group' from here */}
          <div className="relative mx-auto h-40 md:h-48 my-6 w-full max-w-xs">
            {/* Aura Rings Behind Central Icon - Removed group-hover effects, retain pulse */}
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <div className="w-48 h-48 md:w-56 md:h-56 bg-blue-400/5 dark:bg-blue-400/10 rounded-full animate-pulse-slow delay-300 transition-all duration-300"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <div className="w-56 h-56 md:w-64 md:h-64 bg-blue-300/5 dark:bg-blue-300/10 rounded-full animate-pulse-slow transition-all duration-300"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <div className="w-64 h-64 md:w-72 md:h-72 bg-blue-200/5 dark:bg-blue-200/10 rounded-full animate-pulse-slow delay-500 transition-all duration-300"></div>
            </div>

            {/* Central Icon Container - ensure it's above aura rings with z-10 */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-32 h-32 md:w-36 md:h-36 bg-blue-50 dark:bg-slate-700 rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 shadow-xl dark:shadow-blue-500/20 flex flex-col items-center justify-center p-4 text-center transform transition-all duration-300 group-hover:scale-105">
                { featureName.toLowerCase() === "delete" && <Trash2 className="w-10 h-10 md:w-12 md:h-12 text-blue-500 dark:text-blue-400 mb-2"/> }
                { featureName.toLowerCase() === "block_sender" && <Ban className="w-10 h-10 md:w-12 md:h-12 text-blue-500 dark:text-blue-400 mb-2"/> }
                { featureName.toLowerCase() === "unsubscribe" && <BellOff className="w-10 h-10 md:w-12 md:h-12 text-blue-500 dark:text-blue-400 mb-2"/> }
                { featureName.toLowerCase() === "mark_read" && <MailOpen className="w-10 h-10 md:w-12 md:h-12 text-blue-500 dark:text-blue-400 mb-2"/> }
                { featureName.toLowerCase() === "apply_label" && <Tag className="w-10 h-10 md:w-12 md:h-12 text-blue-500 dark:text-blue-400 mb-2"/> }
                { featureName.toLowerCase() === "delete_with_exceptions" && <PencilOff className="w-10 h-10 md:w-12 md:h-12 text-blue-500 dark:text-blue-400 mb-2"/> }
                { !["delete", "block_sender", "unsubscribe", "mark_read", "apply_label", "delete_with_exceptions"].includes(featureName.toLowerCase()) && <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-blue-500 dark:text-blue-400 mb-2"/> }
                <p className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300">{formattedFeatureName}</p>
              </div>
            </div>

            {/* Floating badges will render on top of aura if positioned correctly within this parent or with higher z-index */}
            {/* Subtle floating cards - Added individual hover effects */}
            <div className="absolute top-0 left-1/4 transform -translate-x-1/2 -translate-y-1/4 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
              <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm dark:bg-slate-700/90 dark:group-hover:bg-slate-600/90 dark:backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 dark:border-slate-600/50 transition-all duration-200 ease-in-out">
                <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-500/20 flex items-center justify-center mr-1.5 flex-shrink-0"><Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" /></div><span className="text-xs font-medium text-gray-700 dark:text-slate-200">Delete</span></div>
              </div>
            </div>
            <div className="absolute bottom-0 right-1/4 transform translate-x-1/2 translate-y-1/4 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
              <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm dark:bg-slate-700/90 dark:group-hover:bg-slate-600/90 dark:backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 dark:border-slate-600/50 transition-all duration-200 ease-in-out">
                <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center mr-1.5 flex-shrink-0"><Ban className="w-3 h-3 text-purple-500 dark:text-purple-400" /></div><span className="text-xs font-medium text-gray-700 dark:text-slate-200">Block</span></div>
              </div>
            </div>
            <div className="absolute top-0 right-1/4 transform translate-x-1/2 -translate-y-1/4 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
              <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm dark:bg-slate-700/90 dark:group-hover:bg-slate-600/90 dark:backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 dark:border-slate-600/50 transition-all duration-200 ease-in-out">
                <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center mr-1.5 flex-shrink-0"><BellOff className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /></div><span className="text-xs font-medium text-gray-700 dark:text-slate-200">Unsubscribe</span></div>
              </div>
            </div>
            <div className="absolute bottom-0 left-1/4 transform -translate-x-1/2 -translate-y-1/4 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
              <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm dark:bg-slate-700/90 dark:group-hover:bg-slate-600/90 dark:backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 dark:border-slate-600/50 transition-all duration-200 ease-in-out">
                <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-green-50 dark:bg-green-500/20 flex items-center justify-center mr-1.5 flex-shrink-0"><MailOpen className="w-3 h-3 text-green-500 dark:text-green-400" /></div><span className="text-xs font-medium text-gray-700 dark:text-slate-200">Mark Read</span></div>
              </div>
            </div>
            <div className="absolute top-1/2 left-0 transform -translate-x-[30%] -translate-y-1/2 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
              <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm dark:bg-slate-700/90 dark:group-hover:bg-slate-600/90 dark:backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 dark:border-slate-600/50 transition-all duration-200 ease-in-out">
                <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-sky-50 dark:bg-sky-500/20 flex items-center justify-center mr-1.5 flex-shrink-0"><Tag className="w-3 h-3 text-sky-500 dark:text-sky-400" /></div><span className="text-xs font-medium text-gray-700 dark:text-slate-200">Labels</span></div>
              </div>
            </div>
            {/* New "Delete with exceptions" Badge */}
            <div className="absolute top-1/2 right-0 transform translate-x-[30%] -translate-y-1/2 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
              <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm dark:bg-slate-700/90 dark:group-hover:bg-slate-600/90 dark:backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 dark:border-slate-600/50 transition-all duration-200 ease-in-out">
                <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center mr-1.5 flex-shrink-0"><PencilOff className="w-3 h-3 text-amber-600 dark:text-amber-400" /></div><span className="text-xs font-medium text-gray-700 dark:text-slate-200">Exceptions</span></div>
              </div>
            </div>
          </div>

          {/* Upgrade Button - Updated text and hover effects */}
          <Button 
            onClick={handleUpgrade}
            disabled={isCheckoutLoading}
            className="w-full max-w-xs px-6 py-6 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white font-semibold rounded-md hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 shadow-lg hover:shadow-blue-500/40 dark:hover:shadow-blue-400/50 hover:brightness-110 transition-all duration-300 flex items-center justify-center group relative overflow-hidden text-base mt-4 mb-2 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:brightness-100"
          >
            <span className="relative z-10">
              {isCheckoutLoading ? 'Creating checkout...' : (
                <>
                  Upgrade to Premium <span className='text-sm opacity-80 dark:opacity-70 ml-0.5'>( $1.89/mo )</span>
                </>
              )}
            </span>
            {isCheckoutLoading ? (
              <Loader2 className="ml-2 h-5 w-5 animate-spin relative z-10" />
            ) : (
              <Rocket className="ml-2 h-5 w-5 transform transition-transform relative z-10 group-hover:rotate-[15deg]" />
            )}
          </Button>
          <p className="text-xs text-gray-500 dark:text-slate-500 mb-8">Billed annually. No auto-renew.</p>

          {/* Alternative Action Text - Updated Copy and Wider max-width, formatted feature name */}
          <p className="text-sm text-gray-600 dark:text-slate-400 max-w-lg">
            Prefer the manual route? You can still {formattedFeatureName.toLowerCase()}
            <button 
              onClick={handleViewInGmail}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium ml-1"
            >
              directly in Gmail
            </button>.
          </p>
          
        </DialogContent>
      </Dialog>
      
      {/* Manage Subscription Modal - shown after successful checkout */}
      <ManageSubscriptionModal
        open={showManageSubscriptionModal}
        onOpenChange={(open) => {
          setShowManageSubscriptionModal(open);
          if (!open) {
            setShowSubscriptionConfetti(false);
          }
        }}
        showConfettiOnMount={showSubscriptionConfetti}
      />
    </>
  )
} 