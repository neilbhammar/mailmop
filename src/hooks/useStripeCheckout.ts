import { useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';

/**
 * Custom hook to handle initiating Stripe Checkout by making a fetch request
 * to our backend. The backend will create a Stripe Checkout Session
 * and redirect the user.
 */
export function useStripeCheckout() {
  const { session } = useAuth();

  const redirectToCheckout = useCallback(async () => {
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

      // Redirect to the checkout URL
      window.location.href = `/api/stripe/checkout/${sessionId}`;

    } catch (err) {
      console.error('Error initiating checkout:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      alert(`Payment initiation error: ${message}`);
    }
  }, [session?.access_token]);

  return { redirectToCheckout };
} 