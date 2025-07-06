import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { supabase } from '@/supabase/client';
import { isEmbeddedBrowser } from '@/lib/utils/embeddedBrowser';

/**
 * Hook for handling Pro upgrade flow from landing page
 * 
 * This hook provides a single function that handles the entire upgrade flow:
 * 1. If user is already signed in and pro -> redirect to dashboard
 * 2. If user is already signed in but not pro -> go to checkout
 * 3. If user is not signed in -> initiate OAuth, then auto-upgrade after auth
 */
export function useProUpgrade() {
  const { user, plan } = useAuth();
  const { redirectToCheckout, isLoading: isCheckoutLoading } = useStripeCheckout();
  const [isLoading, setIsLoading] = useState(false);

  const initiateProUpgrade = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Check if user is already signed in
      if (user) {
        console.log('[ProUpgrade] User already authenticated:', user.email);
        
        // Check if they're already pro
        if (plan === 'pro') {
          console.log('[ProUpgrade] User already has Pro, redirecting to dashboard');
          window.location.href = '/dashboard';
          return;
        }
        
        // User exists but isn't pro - go directly to checkout
        console.log('[ProUpgrade] Existing user not pro, initiating checkout');
        await redirectToCheckout(() => {
          console.log('[ProUpgrade] Checkout successful, redirecting to dashboard');
          window.location.href = '/dashboard?success=true';
        });
        return;
      }

      // Step 2: User not signed in - initiate OAuth flow
      console.log('[ProUpgrade] No user found, initiating OAuth');
      
      // Check for embedded browser
      if (isEmbeddedBrowser()) {
        window.location.href = '/open-in-browser';
        return;
      }

      // Start OAuth with special redirect that will handle the post-auth logic
      // Use window.location.origin for localhost, fallback to env var for production
      const redirectUrl = window.location.origin;
      console.log('[ProUpgrade] Using redirect URL:', `${redirectUrl}/dashboard?upgrade=auto`);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: `${redirectUrl}/dashboard?upgrade=auto`,
          queryParams: {
            upgrade_source: 'landing_page',
            upgrade_intent: 'pro'
          }
        }
      });

      if (error) {
        console.error('[ProUpgrade] OAuth error:', error);
        throw error;
      }

    } catch (error) {
      console.error('[ProUpgrade] Error during upgrade flow:', error);
      // Show user-friendly error
      alert('Something went wrong. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  }, [user, plan, redirectToCheckout]);

  return {
    initiateProUpgrade,
    isLoading: isLoading || isCheckoutLoading
  };
} 