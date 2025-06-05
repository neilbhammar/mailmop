import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';

/**
 * Custom hook to handle initiating Stripe Checkout by making a fetch request
 * to our backend. The backend will create a Stripe Checkout Session
 * and redirect the user.
 */
export function useStripeCheckout() {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [onCheckoutSuccess, setOnCheckoutSuccess] = useState<(() => void) | null>(null);

  // Listen for messages from checkout tab
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our domain for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'MAILMOP_CHECKOUT_SUCCESS') {
        console.log('Checkout completed successfully in new tab');
        if (onCheckoutSuccess) {
          onCheckoutSuccess();
          setOnCheckoutSuccess(null); // Clear the callback
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCheckoutSuccess]);

  const redirectToCheckout = useCallback(async (successCallback?: () => void) => {
    // Prevent multiple simultaneous requests
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Store the success callback for when checkout completes
    if (successCallback) {
      setOnCheckoutSuccess(() => successCallback);
    }
    
    try {
      console.log('Initiating Stripe checkout...');

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Open checkout in a new tab to avoid disrupting the ongoing analysis
      const checkoutUrl = `/api/stripe/checkout/${sessionId}`;
      const newTab = window.open(checkoutUrl, '_blank');
      
      // Check if popup was blocked
      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        // Fallback to same tab if popup blocked
        console.warn('Popup blocked, falling back to same tab redirect');
        window.location.href = checkoutUrl;
      }

    } catch (err) {
      console.error('Error initiating checkout:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      alert(`Payment initiation error: ${message}`);
      // Clear the callback on error
      setOnCheckoutSuccess(null);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, isLoading]);

  return { 
    redirectToCheckout, 
    isLoading 
  };
} 