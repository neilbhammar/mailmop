"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthProvider"
import { useStripeCheckout } from "@/hooks/useStripeCheckout"
import { CreditCard, HelpCircle, X, Crown, Calendar, RotateCcw, Sparkles, CheckCircle2, AlertCircle, Rocket, BookOpen, ExternalLink, Loader2 } from "lucide-react"
import { differenceInDays, format } from 'date-fns'
import { useState, useEffect } from "react"
import { toast } from 'sonner'
import Confetti from 'react-confetti'
import { useWindowSize } from '@react-hook/window-size'

interface ManageSubscriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  showConfettiOnMount?: boolean
}

export function ManageSubscriptionModal({
  open,
  onOpenChange,
  showConfettiOnMount = false
}: ManageSubscriptionModalProps) {
  const { profile, session } = useAuth()
  const { redirectToCheckout, isLoading: isCheckoutLoading } = useStripeCheckout()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfetti, setShowConfetti] = useState(showConfettiOnMount)
  const [windowWidth, windowHeight] = useWindowSize()
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)

  // Update confetti state when showConfettiOnMount changes
  useEffect(() => {
    if (showConfettiOnMount) {
      console.log('[ManageSubscriptionModal] Starting confetti from checkout success');
      setShowConfetti(true);
    }
  }, [showConfettiOnMount]);

  // Debug logging for profile changes
  useEffect(() => {
    console.log('[SubscriptionModal] Profile updated:', {
      plan: profile?.plan,
      cancel_at_period_end: profile?.cancel_at_period_end,
      plan_expires_at: profile?.plan_expires_at
    })
  }, [profile])

  const handleRenew = async () => {
    onOpenChange(false)
    await redirectToCheckout(() => {
      // This callback runs when checkout is successful
      // Re-open the modal with confetti
      onOpenChange(true)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    })
  }

  const handleClose = () => {
    setShowConfetti(false)
    onOpenChange(false)
  }

  const handleBillingPortal = async () => {
    if (!session?.access_token) {
      console.error('[SubscriptionModal] Missing session');
      toast.error('Authentication required. Please refresh the page.');
      return;
    }

    setIsOpeningPortal(true);
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to open billing portal');
      }

      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('[SubscriptionModal] Error opening billing portal:', error);
      toast.error('Failed to open billing portal. Please try again.');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleAutoRenewToggle = async (enabled: boolean) => {
    if (!profile?.stripe_subscription_id || !session?.access_token) {
      console.error('[SubscriptionModal] Missing subscription ID or session:', {
        subscriptionId: profile?.stripe_subscription_id,
        hasSession: !!session?.access_token
      })
      return;
    }
    
    setIsUpdating(true);
    try {
      console.log('[SubscriptionModal] Updating auto-renew:', {
        enabled,
        subscriptionId: profile.stripe_subscription_id
      })

      const response = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subscriptionId: profile.stripe_subscription_id,
          cancelAtPeriodEnd: !enabled
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[SubscriptionModal] Update failed:', error)
        throw new Error(error || 'Failed to update subscription');
      }

      const result = await response.json();
      console.log('[SubscriptionModal] Update successful:', result)

      // Show success message and confetti if enabling auto-renew
      if (enabled) {
        toast.success('Auto-renew enabled! Your subscription will automatically renew.');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      } else {
        toast.success('Auto-renew disabled. Your subscription will expire at the end of the period.');
      }
    } catch (error) {
      console.error('[SubscriptionModal] Error updating subscription:', error);
      toast.error('Failed to update auto-renew setting. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  let planExpiryDate = "N/A";
  let isExpired = true;
  let isPro = profile?.plan === 'pro';
  let daysRemaining = 0;

  if (profile && isPro && profile.plan_expires_at) {
    const expirationDate = new Date(profile.plan_expires_at);
    const today = new Date();
    daysRemaining = differenceInDays(expirationDate, today);
    planExpiryDate = format(expirationDate, 'MMMM d, yyyy');
    isExpired = daysRemaining < 0;
  }

  // For Pro users, we need to determine if they're expired differently
  // If cancel_at_period_end is false (auto-renewal enabled), they're not expired
  if (isPro && profile?.cancel_at_period_end === false) {
    isExpired = false;
  }

  const getButtonAction = () => {
    if (!isPro) {
      return handleRenew; // Upgrade to Pro
    }
    return () => window.open('mailto:help@mailmop.com?subject=Help me get the most out of MailMop Pro&body=Hi! I have MailMop Pro and would love some guidance on how to use the advanced features effectively. Thanks!', '_blank');
  };

  const getButtonIcon = () => {
    if (!isPro && isCheckoutLoading) {
      return <Loader2 className="w-4 h-4 mr-2 animate-spin" />;
    }
    if (!isPro) {
      return <CreditCard className="w-4 h-4 mr-2" />;
    }
    return <BookOpen className="w-4 h-4 mr-2" />;
  };

  const getButtonText = () => {
    if (!isPro) {
      return isCheckoutLoading ? "Creating checkout..." : "Upgrade to Pro";
    }
    return "Learn how to use Pro";
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowWidth}
          height={windowHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden">
          {/* Hidden title for accessibility */}
          <DialogTitle className="sr-only">Subscription Management</DialogTitle>
          
          {/* Header */}
          <div className="relative bg-white dark:bg-slate-800/50 px-8 py-6">

            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Subscription</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your MailMop account</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-2">
            {/* Current Plan Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                    Current Plan
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {isPro ? 'MailMop Pro' : 'Free'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Auto-Renewal Section */}
              {isPro && !isExpired && (
                <div className="border border-none rounded-lg p-0">
                  <div className="flex items-center space-x-3 mb-3">
                    <RotateCcw className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Auto-Renewal {profile?.cancel_at_period_end === false ? 'Enabled' : profile?.plan_expires_at ? `Disabled | Expires on ${planExpiryDate}` : 'Disabled'}
                    </span>
                  </div>
        
        <button 
                    onClick={() => handleAutoRenewToggle(profile?.cancel_at_period_end !== false)}
                    disabled={isUpdating}
                    className="w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-600 group-hover:border-slate-300 dark:group-hover:border-slate-500 transition-all duration-200 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 group-disabled:hover:border-slate-200 dark:group-disabled:hover:border-slate-600 group-disabled:hover:bg-transparent">
                      <div className="flex-1">
                        <p className="text-sm text-slate-900 dark:text-slate-100 mb-1">
                          {isUpdating ? (
                            profile?.cancel_at_period_end !== false 
                              ? 'Enabling auto-renewal...'
                              : 'Disabling auto-renewal...'
                          ) : (
                            profile?.cancel_at_period_end === false 
                              ? 'Auto-renewal is enabled'
                              : 'Click to enable auto-renewal'
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {isUpdating ? (
                            'Please wait while we update your subscription...'
                          ) : (
                            profile?.cancel_at_period_end === false 
                              ? 'Your subscription will automatically renew each year'
                              : 'Never worry about your subscription expiring again'
                          )}
                        </p>
                      </div>
                      <div className="ml-3">
                        {isUpdating ? (
                          <RotateCcw className="h-5 w-5 text-slate-400 animate-spin" />
                        ) : profile?.cancel_at_period_end === false ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Status Messages */}
              {!isPro && (
                <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Upgrade to unlock advanced email management features
                </p>
                </div>
              )}

              {isPro && isExpired && (
                <div className="flex items-center space-x-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Your subscription has expired. Renew to continue using Pro features.
                </p>
              </div>
            )}
          </div>
          
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={getButtonAction()}
                disabled={isCheckoutLoading}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg shadow-sm transition-all duration-200"
              >
                {getButtonIcon()}
                {getButtonText()}
              </Button>
              
              {isPro && (
          <Button 
            variant="outline"
            onClick={handleBillingPortal}
            disabled={isOpeningPortal}
                  className="h-11 px-4 rounded-lg border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOpeningPortal ? (
              <>
                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Billing Portal
              </>
            )}
            </Button>
          )}
            </div>
          </div>
      </DialogContent>
    </Dialog>
    </>
  )
} 