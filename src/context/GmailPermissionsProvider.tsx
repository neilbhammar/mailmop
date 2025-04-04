import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { GmailPermissionState, GoogleTokenResponse, GoogleTokenClient, GoogleTokenClientConfig } from '@/types/gmail';
import { getStoredToken, isTokenValid, hasStoredAnalysis, storeGmailToken } from '@/lib/gmail/tokenStorage';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

interface GmailPermissionsContextType extends GmailPermissionState {
  isLoading: boolean;
  isClientLoaded: boolean;
  requestPermissions: () => Promise<boolean>;
  shouldShowPermissionsModal: boolean;
}

const GmailPermissionsContext = createContext<GmailPermissionsContextType | null>(null);

export function GmailPermissionsProvider({ children }: { children: ReactNode }) {
  const [permissionState, setPermissionState] = useState<GmailPermissionState>({
    hasToken: false,
    isTokenValid: false,
    hasEmailData: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

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

    console.log('[Gmail] Permission state changing to:', newState);
    setPermissionState(newState);

    // Calculate and log if modal should show with new state
    const shouldShow = !newState.hasToken && !newState.hasEmailData;
    console.log('[Gmail] Modal should show:', shouldShow);

    return newState;
  }, []);

  // Initial check on mount
  useEffect(() => {
    console.log('[Gmail] Running initial permission state check');
    checkPermissionState();
  }, [checkPermissionState]);

  // Request Gmail permissions
  const requestPermissions = useCallback(async () => {
    if (!isClientLoaded) {
      console.error('[Gmail] OAuth client not loaded yet');
      return false;
    }

    console.log('[Gmail] Requesting permissions...');
    setIsLoading(true);
    try {
      // Initialize Google client
      const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
        console.log('[Gmail] Initializing OAuth client...');
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          scope: GMAIL_SCOPE,
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
  }, [isClientLoaded, checkPermissionState]);

  // Determine if we need to show the permissions modal
  const shouldShowPermissionsModal = !permissionState.hasToken && !permissionState.hasEmailData;

  // Log any changes to the modal visibility
  useEffect(() => {
    console.log('[Gmail] Modal visibility changed:', { 
      shouldShow: shouldShowPermissionsModal,
      state: permissionState 
    });
  }, [shouldShowPermissionsModal, permissionState]);

  const value = {
    ...permissionState,
    isLoading,
    isClientLoaded,
    requestPermissions,
    shouldShowPermissionsModal,
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