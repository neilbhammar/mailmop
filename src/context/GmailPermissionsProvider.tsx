'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { GmailPermissionState, GoogleTokenResponse, GoogleTokenClient, GoogleTokenClientConfig } from '@/types/gmail';
import { getStoredToken, isTokenValid, hasStoredAnalysis, storeGmailToken, clearToken as clearStoredToken } from '@/lib/gmail/tokenStorage';
import { fetchGmailProfile } from '@/lib/gmail/fetchProfile';
import { useAuth } from './AuthProvider';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

interface GmailPermissionsContextType extends GmailPermissionState {
  isLoading: boolean;
  isClientLoaded: boolean;
  requestPermissions: () => Promise<boolean>;
  shouldShowPermissionsModal: boolean;
  shouldShowMismatchModal: boolean;
  gmailEmail: string | null;
  clearToken: () => void;
}

const GmailPermissionsContext = createContext<GmailPermissionsContextType | null>(null);

export function GmailPermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<GmailPermissionState>({
    hasToken: false,
    isTokenValid: false,
    hasEmailData: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [shouldShowMismatchModal, setShouldShowMismatchModal] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);

  // Load Google OAuth client script
  useEffect(() => {
    if (document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`)) {
      console.log('[Gmail] OAuth client script already loaded');
      setIsClientLoaded(true);
      return;
    }

    console.log('[Gmail] Loading OAuth client script...');
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[Gmail] OAuth client script loaded successfully');
      setIsClientLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  // Check initial state on mount and after permissions granted
  const checkPermissionState = useCallback(() => {
    const token = getStoredToken();
    const tokenValid = isTokenValid();
    const hasData = hasStoredAnalysis();

    const newState = {
      hasToken: !!token,
      isTokenValid: tokenValid,
      hasEmailData: hasData,
    };

    console.log('[Gmail] Permission state check:', {
      hasData,
      tokenValid
    });

    setPermissionState(newState);
    return newState;
  }, []);

  // Initial check on mount
  useEffect(() => {
    console.log('[Gmail] Running initial permission state check');
    checkPermissionState();
  }, [checkPermissionState]);

  // Listen for localStorage changes and window focus
  useEffect(() => {
    // Function to handle storage changes
    const handleStorageChange = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { key } = e.detail as { key: string };
        if (key === 'email_analysis' || key === 'gmail_token' || key === 'email_data') {
          console.log('[Gmail] Storage changed, rechecking state');
          checkPermissionState();
        }
      }
    };

    // Function to handle window focus
    const handleFocus = () => {
      console.log('[Gmail] Window focused, rechecking state');
      checkPermissionState();
    };

    // Add listeners
    window.addEventListener('mailmop:storage-change', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    // Initial check
    checkPermissionState();

    // Cleanup
    return () => {
      window.removeEventListener('mailmop:storage-change', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkPermissionState]);

  // Verify Gmail profile matches Supabase user
  const verifyEmailMatch = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const profile = await fetchGmailProfile(accessToken);
      setGmailEmail(profile.emailAddress);
      
      const emailsMatch = profile.emailAddress.toLowerCase() === user?.email?.toLowerCase();
      if (!emailsMatch) {
        console.log('[Gmail] Email mismatch detected:', {
          gmail: profile.emailAddress,
          supabase: user?.email
        });
        setShouldShowMismatchModal(true);
        clearStoredToken();
        return false;
      }
      
      setShouldShowMismatchModal(false);
      return true;
    } catch (error) {
      console.error('[Gmail] Failed to verify email match:', error);
      clearStoredToken();
      return false;
    }
  }, [user?.email]);

  // Request Gmail permissions
  const requestPermissions = useCallback(async () => {
    if (!isClientLoaded) {
      console.error('[Gmail] OAuth client not loaded yet');
      return false;
    }

    if (!user?.email) {
      console.error('[Gmail] No authenticated user email found');
      return false;
    }

    console.log('[Gmail] Requesting permissions...');
    setIsLoading(true);
    try {
      // Initialize Google client with login_hint
      const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
        console.log('[Gmail] Initializing OAuth client...');
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          scope: GMAIL_SCOPE,
          login_hint: user.email, // Pre-fill with Supabase user's email
          callback: (response: GoogleTokenResponse) => {
            console.log('[Gmail] Received OAuth response:', { 
              hasError: !!response.error,
              hasToken: !!response.access_token 
            });
            if (response.error) {
              reject(response);
            } else {
              resolve(response);
            }
          },
        });
        client.requestAccessToken();
      });

      // Verify email matches before storing token
      const emailVerified = await verifyEmailMatch(tokenResponse.access_token);
      if (!emailVerified) {
        return false;
      }

      console.log('[Gmail] Permissions granted successfully, storing token...');
      
      // Store the new token
      storeGmailToken(tokenResponse.access_token, tokenResponse.expires_in);
      
      // Force an immediate state check
      const newState = checkPermissionState();
      console.log('[Gmail] State after permission grant:', newState);

      return true;
    } catch (error) {
      console.error('[Gmail] Failed to get permissions:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isClientLoaded, checkPermissionState, verifyEmailMatch, user?.email]);

  // Determine if we need to show the permissions modal
  const shouldShowPermissionsModal = false; // Disabled - permissions now handled in IntroStepper - old logic was: !permissionState.isTokenValid && !permissionState.hasEmailData && !shouldShowMismatchModal;

  // Log any changes to the modal visibility
  useEffect(() => {
    console.log('[Gmail] Modal visibility changed:', { 
      shouldShow: shouldShowPermissionsModal,
      state: permissionState 
    });
  }, [shouldShowPermissionsModal, permissionState]);

  const clearToken = useCallback(() => {
    clearStoredToken();
    // Force an immediate state check to update UI
    setPermissionState(prev => ({
      ...prev,
      hasToken: false,
      isTokenValid: false
    }));
  }, []);

  const value = {
    ...permissionState,
    isLoading,
    isClientLoaded,
    requestPermissions,
    shouldShowPermissionsModal,
    shouldShowMismatchModal,
    gmailEmail,
    clearToken,
  };

  return (
    <GmailPermissionsContext.Provider value={value}>
      {children}
    </GmailPermissionsContext.Provider>
  );
}

export function useGmailPermissions() {
  const context = useContext(GmailPermissionsContext);
  if (!context) {
    throw new Error('useGmailPermissions must be used within a GmailPermissionsProvider');
  }
  return context;
} 