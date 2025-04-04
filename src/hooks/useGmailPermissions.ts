import { useCallback, useEffect, useState } from 'react';
import { GmailPermissionState, GoogleTokenResponse, GoogleTokenClient, GoogleTokenClientConfig } from '@/types/gmail';
import { getStoredToken, isTokenValid, hasStoredAnalysis, storeGmailToken } from '@/lib/gmail/tokenStorage';

// Declare the google namespace
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient(config: GoogleTokenClientConfig): GoogleTokenClient;
        };
      };
    };
  }
}

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export function useGmailPermissions() {
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

    console.log('[Gmail] Checking permission state:', {
      hasToken: !!token,
      isTokenValid: tokenValid,
      hasEmailData: hasData
    });

    setPermissionState({
      hasToken: !!token,
      isTokenValid: tokenValid,
      hasEmailData: hasData,
    });
  }, []);

  // Initial check on mount
  useEffect(() => {
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
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          scope: GMAIL_SCOPE,
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

      console.log('[Gmail] Permissions granted successfully');
      
      // Store the new token
      storeGmailToken(tokenResponse.access_token, tokenResponse.expires_in);
      
      // Immediately check and update state to prevent stale UI
      checkPermissionState();

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

  return {
    ...permissionState,
    isLoading,
    isClientLoaded,
    requestPermissions,
    shouldShowPermissionsModal,
  };
} 