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
import { ExternalLink, X, Trash2, BellOff, MailOpen, Ban, Tag, FilterIcon, Sparkles, Rocket } from "lucide-react"

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
      {/* Modal background gradient applied, dot pattern div removed */}
      <DialogContent className="sm:max-w-2xl p-8 md:p-10 rounded-xl overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center text-center">
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
          className="absolute right-4 top-4 z-50 bg-white/70 backdrop-blur-sm rounded-full p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white transition-colors border border-gray-200 shadow-sm"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        
        {/* Main Title - Icon removed, "Use" capitalized */}
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 mt-6 flex items-center justify-center">
          Upgrade to Use {formattedFeatureName}
        </h2>

        {/* Subtitle/Description - Wider max-width */}
        <p className="text-gray-600 text-base md:text-lg mb-8 max-w-lg">
          Instantly unlock <strong>{formattedFeatureName}</strong> and our full suite of one-click actions to save hundreds of hours. Cheaper than a donut.
        </p>

        {/* Visual Showcase: Removed 'group' from here */}
        <div className="relative mx-auto h-40 md:h-48 my-6 w-full max-w-xs">
          {/* Aura Rings Behind Central Icon - Removed group-hover effects, retain pulse */}
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="w-48 h-48 md:w-56 md:h-56 bg-blue-400/5 rounded-full animate-pulse-slow delay-300 transition-all duration-300"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="w-56 h-56 md:w-64 md:h-64 bg-blue-300/5 rounded-full animate-pulse-slow transition-all duration-300"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="w-64 h-64 md:w-72 md:h-72 bg-blue-200/5 rounded-full animate-pulse-slow delay-500 transition-all duration-300"></div>
          </div>

          {/* Central Icon Container - ensure it's above aura rings with z-10 */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-32 h-32 md:w-36 md:h-36 bg-blue-50 rounded-2xl border-2 border-blue-200 shadow-xl flex flex-col items-center justify-center p-4 text-center transform transition-all duration-300 group-hover:scale-105">
              { featureName.toLowerCase() === "delete" && <Trash2 className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-2"/> }
              { featureName.toLowerCase() === "block sender" && <Ban className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-2"/> }
              { featureName.toLowerCase() === "unsubscribe" && <BellOff className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-2"/> }
              { featureName.toLowerCase() === "mark as read" && <MailOpen className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-2"/> }
              { featureName.toLowerCase() === "apply labels" && <Tag className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-2"/> }
              { featureName.toLowerCase() === "delete with exceptions" && <FilterIcon className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-2"/> }
              { !["delete", "block sender", "unsubscribe", "mark as read", "apply labels", "delete with exceptions"].includes(featureName.toLowerCase()) && <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-2"/> }
              <p className="text-xs md:text-sm font-medium text-blue-700">{formattedFeatureName}</p>
            </div>
          </div>

          {/* Floating badges will render on top of aura if positioned correctly within this parent or with higher z-index */}
          {/* Subtle floating cards - Added individual hover effects */}
          <div className="absolute top-0 left-1/4 transform -translate-x-1/2 -translate-y-1/4 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
            <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 transition-all duration-200 ease-in-out">
              <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center mr-1.5 flex-shrink-0"><Trash2 className="w-3 h-3 text-red-500" /></div><span className="text-xs font-medium text-gray-700">Delete</span></div>
            </div>
          </div>
          <div className="absolute bottom-0 right-1/4 transform translate-x-1/2 translate-y-1/4 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
            <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 transition-all duration-200 ease-in-out">
              <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center mr-1.5 flex-shrink-0"><Ban className="w-3 h-3 text-purple-500" /></div><span className="text-xs font-medium text-gray-700">Block</span></div>
            </div>
          </div>
          <div className="absolute top-0 right-1/4 transform translate-x-1/2 -translate-y-1/4 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
            <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 transition-all duration-200 ease-in-out">
              <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center mr-1.5 flex-shrink-0"><BellOff className="w-3 h-3 text-indigo-500" /></div><span className="text-xs font-medium text-gray-700">Unsubscribe</span></div>
            </div>
          </div>
          <div className="absolute bottom-0 left-1/4 transform -translate-x-1/2 translate-y-1/4 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
            <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 transition-all duration-200 ease-in-out">
              <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mr-1.5 flex-shrink-0"><MailOpen className="w-3 h-3 text-green-500" /></div><span className="text-xs font-medium text-gray-700">Mark Read</span></div>
            </div>
          </div>
          <div className="absolute top-1/2 left-0 transform -translate-x-[30%] -translate-y-1/2 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
            <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 transition-all duration-200 ease-in-out">
              <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-sky-50 flex items-center justify-center mr-1.5 flex-shrink-0"><Tag className="w-3 h-3 text-sky-500" /></div><span className="text-xs font-medium text-gray-700">Labels</span></div>
            </div>
          </div>
          {/* New "Delete with exceptions" Badge */}
          <div className="absolute top-1/2 right-0 transform translate-x-[30%] -translate-y-1/2 opacity-95 hover:opacity-100 transition-all duration-200 ease-in-out z-20 group hover:scale-105 hover:-translate-y-1">
            <div className="bg-white/95 group-hover:bg-white backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg p-2.5 max-w-[140px] border border-gray-100 transition-all duration-200 ease-in-out">
              <div className="flex items-center"><div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center mr-1.5 flex-shrink-0"><FilterIcon className="w-3 h-3 text-amber-600" /></div><span className="text-xs font-medium text-gray-700">Exceptions</span></div>
            </div>
          </div>
        </div>

        {/* Upgrade Button - Updated text and hover effects */}
        <Button 
          onClick={() => window.location.href = '/dashboard/upgrade'}
          className="w-full max-w-xs px-6 py-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-md hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-blue-500/40 hover:brightness-110 transition-all duration-300 flex items-center justify-center group relative overflow-hidden text-base mt-4 mb-2 transform hover:scale-105"
        >
          <span className="relative z-10">
            Upgrade to Premium <span className='text-sm opacity-80 ml-0.5'>( $1.89/mo )</span>
          </span>
          <Rocket className="ml-2 h-5 w-5 transform transition-transform relative z-10 group-hover:rotate-[15deg]" />
        </Button>
        <p className="text-xs text-gray-500 mb-8">Billed annually</p>

        {/* Alternative Action Text - Updated Copy and Wider max-width, formatted feature name */}
        <p className="text-sm text-gray-600 max-w-lg">
          Prefer the manual route? You can still {formattedFeatureName.toLowerCase()}
          <button 
            onClick={handleViewInGmail}
            className="text-blue-600 hover:text-blue-700 underline font-medium ml-1"
          >
            directly in Gmail
          </button>.
        </p>
        
      </DialogContent>
    </Dialog>
  )
} 