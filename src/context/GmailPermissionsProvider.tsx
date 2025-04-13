'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { GmailPermissionState, GoogleTokenResponse, GoogleTokenClient, GoogleTokenClientConfig, TokenStatus, TokenStatusOptions, TokenRunStatus } from '@/types/gmail';
import { getStoredToken, storeGmailToken, clearToken as clearStoredToken, STORAGE_CHANGE_EVENT } from '@/lib/gmail/tokenStorage';
import { fetchGmailProfile } from '@/lib/gmail/fetchProfile';
import { fetchGmailStats } from '@/lib/gmail/fetchGmailStats';
import { useAuth } from './AuthProvider';
import { ANALYSIS_CHANGE_EVENT, hasSenderAnalysis } from '@/lib/storage/senderAnalysis';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// Default expiring soon threshold (5 minutes)
const DEFAULT_EXPIRING_SOON_MS = 5 * 60 * 1000;

interface GmailPermissionsContextType extends GmailPermissionState {
  isLoading: boolean;
  isClientLoaded: boolean;
  requestPermissions: () => Promise<boolean>;
  shouldShowPermissionsModal: boolean;
  shouldShowMismatchModal: boolean;
  gmailEmail: string | null;
  clearToken: () => void;
  tokenStatus: TokenStatus;
  canTokenSurvive: (durationMs: number) => boolean;
  getTokenRunStatus: (durationMs: number) => TokenRunStatus;
}

const GmailPermissionsContext = createContext<GmailPermissionsContextType | null>(null);

export function GmailPermissionsProvider({ 
  children,
  expiringSoonThresholdMs = DEFAULT_EXPIRING_SOON_MS 
}: { 
  children: ReactNode;
  expiringSoonThresholdMs?: number;
}) {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<GmailPermissionState>({
    hasToken: false,
    hasEmailData: false,
  });
  
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({
    isValid: false,
    expiresAt: null,
    timeRemaining: 0,
    state: 'expired'
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
  const checkPermissionState = useCallback(async () => {
    const token = getStoredToken();
    const hasData = await hasSenderAnalysis();

    const newState = {
      hasToken: !!token,
      hasEmailData: hasData,
    };

    console.log('[Gmail] Permission state check:', {
      hasData,
    });

    setPermissionState(newState);
    return newState;
  }, []);

  // Initial check on mount
  useEffect(() => {
    console.log('[Gmail] Running initial permission state check');
    checkPermissionState();
  }, [checkPermissionState]);

  // Listen for storage changes and window focus
  useEffect(() => {
    // Function to handle storage changes
    const handleStorageChange = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { key } = e.detail as { key: string };
        if (key === 'gmail_token' || key === 'email_data') {
          console.log('[Gmail] Storage changed, rechecking state');
          checkPermissionState();
        }
      }
    };

    // Function to handle analysis changes
    const handleAnalysisChange = () => {
      console.log('[Gmail] Analysis changed, rechecking state');
      checkPermissionState();
    };

    // Function to handle window focus
    const handleFocus = () => {
      console.log('[Gmail] Window focused, rechecking state');
      checkPermissionState();
    };

    // Add listeners
    window.addEventListener('mailmop:storage-change', handleStorageChange);
    window.addEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    window.addEventListener('focus', handleFocus);

    // Initial check
    checkPermissionState();

    // Cleanup
    return () => {
      window.removeEventListener('mailmop:storage-change', handleStorageChange);
      window.removeEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
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

  // Function to update token status
  const updateTokenStatus = useCallback(() => {
    console.log('[Gmail] Updating token status');
    const token = getStoredToken();
    const now = Date.now();
    
    if (!token?.expiresAt) {
      setTokenStatus({
        isValid: false,
        expiresAt: null,
        timeRemaining: 0,
        state: 'expired'
      });
      
      setPermissionState(prev => ({
        ...prev,
        hasToken: false
      }));
      return;
    }

    const timeRemaining = token.expiresAt - now;
    const isValid = timeRemaining > 0;
    
    const state = !isValid ? 'expired' 
                 : timeRemaining < expiringSoonThresholdMs ? 'expiring_soon'
                 : 'valid';

    setTokenStatus({
      isValid,
      expiresAt: token.expiresAt,
      timeRemaining,
      state
    });
    
    setPermissionState(prev => ({
      ...prev,
      hasToken: true
    }));
  }, [expiringSoonThresholdMs]);

  // Update token status in various scenarios
  useEffect(() => {
    // Initial update
    updateTokenStatus();

    // Set up periodic check (backup)
    const interval = setInterval(updateTokenStatus, 30000);

    // Handle storage changes
    const handleStorageChange = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { key } = e.detail as { key: string };
        if (key === 'gmail_token') {
          console.log('[Gmail] Token storage changed, updating status');
          updateTokenStatus();
        }
      }
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Gmail] Page became visible, updating token status');
        updateTokenStatus();
      }
    };

    // Handle focus
    const handleFocus = () => {
      console.log('[Gmail] Window focused, updating token status');
      updateTokenStatus();
    };

    // Add all listeners
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [updateTokenStatus]);

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
      const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
        console.log('[Gmail] Initializing OAuth client...');
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          scope: GMAIL_SCOPE,
          login_hint: user.email,
          callback: (response: GoogleTokenResponse) => {
            if (response.error) {
              reject(response);
            } else {
              resolve(response);
            }
          },
        });
        client.requestAccessToken();
      });

      const emailVerified = await verifyEmailMatch(tokenResponse.access_token);
      if (!emailVerified) {
        return false;
      }

      console.log('[Gmail] Permissions granted successfully, storing token...');
      storeGmailToken(tokenResponse.access_token, tokenResponse.expires_in);
      
      // Immediately update token status
      updateTokenStatus();

      try {
        await fetchGmailStats(tokenResponse.access_token);
      } catch (statsError) {
        console.error('[Gmail] Failed to fetch Gmail stats after authentication:', statsError);
      }

      return true;
    } catch (error) {
      console.error('[Gmail] Failed to get permissions:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isClientLoaded, updateTokenStatus, verifyEmailMatch, user?.email]);

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
    // Immediately update token status
    updateTokenStatus();
    // Also update permission state
    setPermissionState(prev => ({
      ...prev,
      hasToken: false
    }));
  }, [updateTokenStatus]);

  // Check if token can survive a given duration
  const canTokenSurvive = useCallback((durationMs: number): boolean => {
    return tokenStatus.timeRemaining > durationMs;
  }, [tokenStatus.timeRemaining]);

  // Get detailed token run status
  const getTokenRunStatus = useCallback((durationMs: number): TokenRunStatus => {
    if (!tokenStatus.isValid) return 'expired';
    return canTokenSurvive(durationMs) ? 'will_survive' : 'will_expire';
  }, [tokenStatus.isValid, canTokenSurvive]);

  const value = {
    ...permissionState,
    isLoading,
    isClientLoaded,
    requestPermissions,
    shouldShowPermissionsModal,
    shouldShowMismatchModal,
    gmailEmail,
    clearToken,
    tokenStatus,
    canTokenSurvive,
    getTokenRunStatus,
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