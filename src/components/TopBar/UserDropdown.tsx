import { useState, useRef, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { ChevronDown, MessageSquare, Settings, CreditCard, HelpCircle, LogOut, RefreshCwOff, RefreshCcw, Sun, Moon, Monitor, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { useTheme } from 'next-themes'
import { RevokeAccessDialog } from '../modals/RevokeAccessDialog'
import { SignOutDialog } from '../modals/SignOutDialog'
import { FeedbackModal } from '../modals/FeedbackModal'
import { ManageSubscriptionModal } from '../modals/ManageSubscriptionModal'
import Image from 'next/image'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'

interface UserDropdownProps {
  user: User
}

export function UserDropdown({ user }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showManageSubscriptionModal, setShowManageSubscriptionModal] = useState(false)
  const { plan } = useAuth()
  const { tokenStatus, requestPermissions, hasRefreshToken } = useGmailPermissions()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { redirectToCheckout } = useStripeCheckout()
  const avatarUrl = user.user_metadata?.avatar_url
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleShowFeedback = () => {
    setShowFeedbackModal(true)
    setIsOpen(false)
  }

  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }

  const getCurrentThemeIcon = () => {
    const current = theme === 'system' ? resolvedTheme : theme;
    if (current === 'light') return <Sun className="w-4 h-4 mr-3" />;
    if (current === 'dark') return <Moon className="w-4 h-4 mr-3" />;
    return <Monitor className="w-4 h-4 mr-3" />;
  };

  const getCurrentThemeName = () => {
    if (theme === 'light') return 'Light Mode';
    if (theme === 'dark') return 'Dark Mode';
    return 'System Default';
  };

  const handleSubscription = async () => {
    setIsOpen(false);
    if (plan === 'pro') {
      setShowManageSubscriptionModal(true);
    } else {
      await redirectToCheckout();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
      >
        <div className="flex items-center space-x-3">
          {avatarUrl ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-slate-600">
              <Image
                src={avatarUrl}
                alt={`${user.email}'s avatar`}
                width={32}
                height={32}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-blue-100/80 mix-blend-multiply" />
            </div>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full text-sm font-medium ring-1 ring-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:ring-slate-600">
              {user.email?.[0].toUpperCase()}
            </div>
          )}
          
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user.user_metadata?.full_name || 'User'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
          </div>
        </div>
        
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform dark:text-gray-500",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-[-1rem] right-[-1rem] mt-2 bg-white border-x border-b border-gray-100 rounded-b-lg shadow-md z-50 dark:bg-slate-800 dark:border-slate-700"
          >
            <div className="py-1">
              {/* Manage Plan / Upgrade to Pro */}
              <button
                onClick={handleSubscription}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                <CreditCard className="w-4 h-4 mr-3 shrink-0" />
                <span className="truncate">
                  {plan === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro'}
                </span>
                <span 
                  className={cn(
                    "ml-auto shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-sm",
                    plan === 'pro'
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-700 dark:text-purple-100"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-700 dark:text-blue-100"
                  )}
                >
                  {plan === 'pro' ? 'Pro' : 'Free'}
                </span>
              </button>

              {/* Gmail Access Button - Show either Revoke or Reconnect */}
              <button
                onClick={() => {
                  if (hasRefreshToken) {
                    setShowRevokeDialog(true)
                    setIsOpen(false)
                  } else {
                    requestPermissions()
                    setIsOpen(false)
                  }
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                {hasRefreshToken ? (
                  <RefreshCwOff className="w-4 h-4 mr-3" />
                ) : (
                  <RefreshCcw className="w-4 h-4 mr-3" />
                )}
                {hasRefreshToken ? 'Revoke Gmail Access' : 'Reconnect Gmail'}
              </button>

              {/* Appearance Section - Single Cycle Button */}
              <button
                onClick={cycleTheme}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                {getCurrentThemeIcon()}
                <span>{getCurrentThemeName()}</span>
              </button>

              {/* Share Feedback */}
              <button
                onClick={handleShowFeedback}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                <MessageSquare className="w-4 h-4 mr-3" />
                Share Feedback
              </button>


              {/* Divider */}
              <div className="h-px my-1 bg-gray-100 dark:bg-slate-700" />

              {/* Sign Out */}
              <button
                onClick={() => {
                  setShowSignOutDialog(true)
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke Access Dialog */}
      <RevokeAccessDialog
        open={showRevokeDialog}
        onOpenChange={setShowRevokeDialog}
      />

      {/* Sign Out Dialog */}
      <SignOutDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Manage Subscription Modal (only rendered when needed) */}
      {plan === 'pro' && (
        <ManageSubscriptionModal
          open={showManageSubscriptionModal}
          onOpenChange={setShowManageSubscriptionModal}
        />
      )}
    </div>
  )
} 