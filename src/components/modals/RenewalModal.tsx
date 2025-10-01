'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthProvider';
import { SignInButton } from '@/components/auth/SignInButton';
import { Rocket, RefreshCw, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';

interface RenewalModalProps {
  open: boolean;
  onClose: () => void;
}

export function RenewalModal({ open, onClose }: RenewalModalProps) {
  const { user, profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<'auto-renew' | 'one-time' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowWidth, windowHeight] = useWindowSize();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setIsProcessing(false);
      setError(null);
      setSelectedOption(null);
      setShowConfetti(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedOption) {
      setError('Please select a renewal option');
      return;
    }

    if (!user || !profile?.stripe_subscription_id) {
      setError('Missing subscription information');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const enableAutoRenew = selectedOption === 'auto-renew';
      
      const response = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: profile.stripe_subscription_id,
          enableAutoRenew,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscription');
      }

      // Success! Show feedback
      if (enableAutoRenew) {
        toast.success('Great! Your subscription will now automatically renew each year.');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      } else {
        toast.success('Perfect! Your subscription has been renewed for one year.');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  // If user is not logged in, show sign in prompt
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden">
          <DialogTitle className="sr-only">Sign In to Renew</DialogTitle>
          
          {/* Header */}
          <div className="relative bg-white dark:bg-slate-800/50 px-8 py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-600 dark:bg-amber-500 rounded-lg flex items-center justify-center">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sign In Required</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Renew your MailMop subscription</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-2">
            <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg mb-6">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Please sign in to your account to renew your MailMop subscription.
              </p>
            </div>
            
            <div className="flex justify-center">
              <SignInButton />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main renewal modal for authenticated users
  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowWidth}
          height={windowHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.05}
          colors={['#6EE7B7', '#3B82F6', '#8B5CF6']}
        />
      )}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden">
          <DialogTitle className="sr-only">Renew Your MailMop Subscription</DialogTitle>
          
          {/* Header */}
          <div className="relative bg-white dark:bg-slate-800/50 px-8 py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 dark:bg-green-500 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Renew Subscription</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Continue using MailMop Pro</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-2">
            {/* Information Section */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3">
                Choose Your Renewal Option
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Your subscription is about to expire. Choose how you'd like to continue with MailMop Pro:
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg mb-6">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Renewal Options */}
            <div className="space-y-4 mb-8">
              {/* Option 1: Renew with Auto-Renew */}
              <button
                onClick={() => setSelectedOption('auto-renew')}
                disabled={isProcessing}
                className="w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedOption === 'auto-renew'
                    ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'border-green-200 dark:border-green-800/50 group-hover:border-green-300 dark:group-hover:border-green-700 group-hover:bg-green-50 dark:group-hover:bg-green-900/10 bg-green-25 dark:bg-green-900/5'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedOption === 'auto-renew'
                          ? 'border-green-600 dark:border-green-500 bg-green-600 dark:bg-green-500'
                          : 'border-green-400 dark:border-green-600'
                      }`}>
                        {selectedOption === 'auto-renew' && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        Enable Auto-Renew
                      </p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Your subscription will automatically renew each year
                    </p>
                  </div>
                  <div className="ml-4">
                    <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-500" />
                  </div>
                </div>
              </button>

              {/* Option 2: Renew without Auto-Renew */}
              <button
                onClick={() => setSelectedOption('one-time')}
                disabled={isProcessing}
                className="w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedOption === 'one-time'
                    ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/50'
                    : 'border-slate-200 dark:border-slate-600 group-hover:border-slate-300 dark:group-hover:border-slate-500 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedOption === 'one-time'
                          ? 'border-slate-600 dark:border-slate-400 bg-slate-600 dark:bg-slate-400'
                          : 'border-slate-400 dark:border-slate-600'
                      }`}>
                        {selectedOption === 'one-time' && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        Renew for One Year
                      </p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Extends your subscription for one year only - no automatic renewal
                    </p>
                  </div>
                  <div className="ml-4">
                    <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
              </button>
            </div>

            {/* Features Reminder */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                Continue enjoying Pro features:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span>Bulk Delete</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span>Mark Read</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span>Apply Labels</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span>Block Senders</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span>Bulk Actions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span>And more...</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mb-6">
              <Button
                onClick={handleSubmit}
                disabled={!selectedOption || isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Submit Renewal'
                )}
              </Button>
            </div>

            {/* Security Footer */}
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                🔒 Secure billing powered by Stripe
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 