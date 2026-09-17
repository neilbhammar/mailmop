'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { GmailPermissionState, GoogleTokenResponse, GoogleTokenClient, GoogleTokenClientConfig, TokenStatus, TokenStatusOptions, TokenRunStatus } from '@/types/gmail';
import { fetchGmailProfile } from '@/lib/gmail/fetchProfile';
import { fetchGmailStats } from '@/lib/gmail/fetchGmailStats';
import { ANALYSIS_CHANGE_EVENT, hasSenderAnalysis } from '@/lib/storage/senderAnalysis';
import { 
  primeAccessToken, 
  getAccessToken as libGetAccessToken, 
  peekAccessToken as libPeekAccessToken, 
  tokenTimeRemaining as libTokenTimeRemaining, 
  revokeAndClearToken, 
  hasRefreshToken as libHasRefreshToken,
  initializeTokenState,
  forceRefreshAccessToken as libForceRefreshAccessToken,
  clearAccessTokenOnlyInStorage,
  expireAccessTokenInStorage,
  getRefreshTokenState,
  dropRefreshToken
} from '@/lib/gmail/token';
import {
  getConnectedInbox,
  reconcileConnectedInbox,
} from '@/lib/storage/userStorage';
import { normalizeInboxAddress } from '@/lib/connectedInbox';
import { logger } from '@/lib/utils/logger';


// Use both scopes - broad scope for general operations and settings.basic for filters
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://mail.google.com/'
].join(' ');

const GOOGLE_GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GOOGLE_API_SCRIPT_URL = 'https://apis.google.com/js/api.js';

// Default expiring soon threshold (5 minutes)
const DEFAULT_EXPIRING_SOON_MS = 5 * 60 * 1000;

interface GmailPermissionsContextType extends GmailPermissionState {
  isLoading: boolean;
  isClientLoaded: boolean;
  requestPermissions: () => Promise<boolean>;
  /** The Gmail address MailMop currently holds a token for, or null. */
  connectedInbox: string | null;
  /** Disconnects the current inbox and opens Google's account chooser. */
  switchInbox: () => Promise<boolean>;
  clearToken: () => Promise<void>;
  tokenStatus: TokenStatus;
  canTokenSurvive: (durationMs: number) => boolean;
  getTokenRunStatus: (durationMs: number) => TokenRunStatus;
  getAccessToken: () => Promise<string>;
  forceRefreshAccessToken: () => Promise<string>;
  peekAccessToken: () => { accessToken: string; expiresAt: number } | null;
  tokenTimeRemaining: () => number;
  hasRefreshToken: boolean;
  clearAccessTokenOnly: () => Promise<void>;
  expireAccessToken: () => Promise<void>;
  refreshTokenState: 'unknown' | 'present' | 'absent';
}

const GmailPermissionsContext = createContext<GmailPermissionsContextType | null>(null);

// Custom event for token changes
export const TOKEN_CHANGE_EVENT = 'mailmop:token-change';

export function GmailPermissionsProvider({ 
  children,
  expiringSoonThresholdMs = DEFAULT_EXPIRING_SOON_MS 
}: { 
  children: ReactNode;
  expiringSoonThresholdMs?: number;
}) {
  const [permissionState, setPermissionState] = useState<GmailPermissionState>({
    hasToken: false,
    hasEmailData: false,
  });
  
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(() => {
    const initialRefreshTokenState = getRefreshTokenState();
    let initialStateForTokenStatus: TokenStatus['state'] = 'initializing';

    if (initialRefreshTokenState === 'present') {
      // If refresh token is present, access token is initially considered expired until checked/refreshed
      initialStateForTokenStatus = 'expired'; 
    } else if (initialRefreshTokenState === 'absent') {
      initialStateForTokenStatus = 'no_connection';
    }
    // If 'unknown', it remains 'initializing'

    return {
      isValid: false,
      expiresAt: null,
      timeRemaining: 0,
      state: initialStateForTokenStatus,
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [isApiClientLoaded, setIsApiClientLoaded] = useState(false);
  const [isGmailClientInitialized, setIsGmailClientInitialized] = useState(false);
  // Which mailbox we are attached to. Hydrated from localStorage rather than
  // waiting on a Gmail profile call, so a reload does not briefly render as if
  // no inbox were connected.
  const [connectedInbox, setConnectedInboxState] = useState<string | null>(null);

  useEffect(() => {
    setConnectedInboxState(getConnectedInbox());
  }, []);

  // Combined client loaded state
  const isClientLoaded = isGsiLoaded && isApiClientLoaded && isGmailClientInitialized;

  // Load Google OAuth client script
  useEffect(() => {
    let gsiScript: HTMLScriptElement | null = null;
    let apiScript: HTMLScriptElement | null = null;
    let scriptsLoaded = { gsi: false, api: false };

    const handleScriptsLoaded = () => {
      // This function is called when *either* script finishes loading.
      // We need both before proceeding to initialize the Gmail client.
      if (!scriptsLoaded.gsi || !scriptsLoaded.api) return; 

      logger.debug('[Gmail] Both GSI and API client scripts loaded. Initializing gapi.client...');
      
      // Now that gapi is available (from api.js), load the gmail client
      gapi.load('client', () => {
        logger.debug('[Gmail] gapi.client loaded. Initializing Gmail API client...');
        gapi.client.load('gmail', 'v1', () => {
          logger.debug('[Gmail] Gmail API client initialized successfully.');
          setIsGmailClientInitialized(true); // Final step: Gmail client ready
        });
      });
    };

    // Load GSI Script (for auth)
    if (!document.querySelector(`script[src="${GOOGLE_GSI_SCRIPT_URL}"]`)) {
      logger.debug('[Gmail] Loading GSI client script...');
      gsiScript = document.createElement('script');
      gsiScript.src = GOOGLE_GSI_SCRIPT_URL;
      gsiScript.async = true;
      gsiScript.defer = true;
      gsiScript.onload = () => {
        logger.debug('[Gmail] GSI client script loaded.');
        setIsGsiLoaded(true);
        scriptsLoaded.gsi = true;
        handleScriptsLoaded(); // Check if both are loaded
      };
      document.head.appendChild(gsiScript);
    } else {
      logger.debug('[Gmail] GSI client script already present.');
      setIsGsiLoaded(true);
      scriptsLoaded.gsi = true;
    }

    // Load API Client Script (for gapi.client)
    if (!document.querySelector(`script[src="${GOOGLE_API_SCRIPT_URL}"]`)) {
      logger.debug('[Gmail] Loading API client script...');
      apiScript = document.createElement('script');
      apiScript.src = GOOGLE_API_SCRIPT_URL;
      apiScript.async = true;
      apiScript.defer = true;
      apiScript.onload = () => {
        logger.debug('[Gmail] API client script loaded.');
        setIsApiClientLoaded(true);
        scriptsLoaded.api = true;
        handleScriptsLoaded(); // Check if both are loaded
      };
      // Handle potential script loading errors
      apiScript.onerror = () => {
         logger.error('[Gmail] Failed to load API client script.');
         // Optionally set an error state
      }
      document.head.appendChild(apiScript);
    } else {
      logger.debug('[Gmail] API client script already present.');
      setIsApiClientLoaded(true);
      scriptsLoaded.api = true;
    }

    // Initial check in case both scripts were already present
    if (scriptsLoaded.gsi && scriptsLoaded.api) {
      handleScriptsLoaded();
    }

    // Cleanup function to remove scripts if component unmounts
    // (might not be strictly necessary but good practice)
    return () => {
      gsiScript?.remove();
      apiScript?.remove();
    };
  }, []);

  // Initialize token state on mount
  useEffect(() => {
    logger.debug('[Gmail] Initializing token state from Provider');
    initializeTokenState().then(() => {
      // After token.ts finishes initializing, updateTokenStatus will correctly set all states.
      updateTokenStatus();
    });
  }, []); // updateTokenStatus is not a direct dependency here, it's called in .then()

  // Check initial state on mount and after permissions granted
  const checkPermissionState = useCallback(async () => {
    const token = libPeekAccessToken();
    const hasData = await hasSenderAnalysis();

    const newState = {
      hasToken: !!token,
      hasEmailData: hasData,
    };

    logger.debug('[Gmail] Permission state check:', {
      hasData,
    });

    setPermissionState(newState);
    return newState;
  }, []);

  // Initial check on mount
  useEffect(() => {
    logger.debug('[Gmail] Running initial permission state check');
    checkPermissionState();
  }, [checkPermissionState]);

  // Listen for storage changes and window focus
  useEffect(() => {
    // Function to handle storage changes
    const handleStorageChange = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { key } = e.detail as { key: string };
        if (key === 'token' || key === 'email_data') {
          logger.debug('[Gmail] Token/data changed, rechecking state');
          checkPermissionState();
        }
      }
    };

    // Function to handle analysis changes
    const handleAnalysisChange = () => {
      logger.debug('[Gmail] Analysis changed, rechecking state');
      checkPermissionState();
    };

    // Add listeners  
    window.addEventListener(TOKEN_CHANGE_EVENT, handleStorageChange);
    window.addEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    // Note: Removed focus listener to prevent unnecessary re-renders when switching tabs

    // Initial check
    checkPermissionState();

    // Cleanup
    return () => {
      window.removeEventListener(TOKEN_CHANGE_EVENT, handleStorageChange);
      window.removeEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    };
  }, [checkPermissionState]);

  /**
   * Records which mailbox the freshly granted token belongs to.
   *
   * This replaces the old `verifyEmailMatch`, which compared the Gmail address
   * against the Supabase login address and revoked the token when they differed
   * — the single thing that made MailMop one-inbox-per-account. The address is
   * now recorded rather than policed, and the only remaining decision is whether
   * the analysis already on this device belongs to a different mailbox.
   */
  const registerConnectedInbox = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const profile = await fetchGmailProfile(accessToken);

      // Clears the previous inbox's analysis if this is a different mailbox,
      // keeps it if the user simply reconnected the same one.
      const cleared = await reconcileConnectedInbox(profile.emailAddress);
      setConnectedInboxState(normalizeInboxAddress(profile.emailAddress));

      if (cleared) {
        logger.debug('[Gmail] Connected a different inbox, previous analysis cleared', {
          component: 'GmailPermissionsProvider',
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to identify the connected inbox', {
        component: 'GmailPermissionsProvider',
        error: error instanceof Error ? error.message : String(error)
      });
      // Without knowing which mailbox this token opens we cannot safely act on
      // it — every later operation would be aimed at an unknown inbox.
      await revokeAndClearToken();
      return false;
    }
  }, []);

  // Function to update token status
  const updateTokenStatus = useCallback(() => {
    logger.debug('Updating token status', { component: 'GmailPermissionsProvider' });
    const currentRefreshTokenState = getRefreshTokenState();

    if (currentRefreshTokenState === 'unknown') {
      setTokenStatus({
        isValid: false,
        expiresAt: null,
        timeRemaining: 0,
        state: 'initializing',
      });
      setPermissionState(prev => ({ ...prev, hasGmailConnection: false, hasToken: false }));
      return;
    }

    const currentHasRefreshToken = libHasRefreshToken(); // This now uses refreshTokenState === 'present'
    setPermissionState(prev => ({
      ...prev,
      hasGmailConnection: currentHasRefreshToken
    }));
    
    const token = libPeekAccessToken();
    if (currentRefreshTokenState === 'absent' || !token) {
      setTokenStatus({
        isValid: false,
        expiresAt: null,
        timeRemaining: 0,
        state: 'no_connection' // If refresh token is absent, it's no_connection
      });
      setPermissionState(prev => ({ ...prev, hasToken: false })); // Ensure hasToken is false
      return;
    }

    // At this point, refreshTokenState is 'present' and we have a memToken (or should attempt refresh)
    const timeRemaining = libTokenTimeRemaining();
    const isValid = timeRemaining > 0;
    const state = !isValid ? 'expired' 
                 : timeRemaining < expiringSoonThresholdMs ? 'expiring_soon'
                 : 'valid';

    setTokenStatus({
      isValid,
      expiresAt: token!.expiresAt, // token is guaranteed to be non-null here if state isn't no_connection
      timeRemaining,
      state
    });
    setPermissionState(prev => ({ ...prev, hasToken: isValid }));

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
        if (key === 'token') {
          logger.debug('Token storage changed, updating status', { 
            component: 'GmailPermissionsProvider' 
          });
          updateTokenStatus();
        }
      }
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.debug('Page became visible, updating token status', { 
          component: 'GmailPermissionsProvider' 
        });
        updateTokenStatus();
      }
    };

    // Handle focus
    const handleFocus = () => {
      logger.debug('Window focused, updating token status', { 
        component: 'GmailPermissionsProvider' 
      });
      updateTokenStatus();
    };

    // Add all listeners
    window.addEventListener(TOKEN_CHANGE_EVENT, handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener(TOKEN_CHANGE_EVENT, handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [updateTokenStatus]);

  // Request Gmail permissions
  //
  // No `login_hint`. It used to pre-select the Supabase login address, which was
  // the right nudge when that was the only mailbox you were allowed to connect;
  // now it would hide the account chooser that makes picking a second inbox
  // possible. Google still defaults to the signed-in account, so the common case
  // is unchanged — it is just no longer forced.
  const requestPermissions = useCallback(async () => {
    if (!isClientLoaded) return false;

    return new Promise<boolean>((resolve, reject) => {
      const codeClient = window.google.accounts.oauth2.initCodeClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        scope: GMAIL_SCOPES,
        ux_mode: 'popup',
        // Google calls `callback` only when consent succeeds. Closing the popup,
        // or a browser blocking it, fires this instead — and without it the
        // promise below never settles, which left the switch dialog spinning on
        // "Waiting for Google..." with its own close button disabled.
        error_callback: (err) => {
          logger.debug('OAuth flow did not complete', {
            component: 'GmailPermissionsProvider',
            type: err?.type,
          });
          reject(new Error(err?.type === 'popup_closed' ? 'popup_closed' : 'oauth_failed'));
        },
        callback: async ({ code, error }) => {
          if (error || !code) {
            logger.error('OAuth error', { component: 'GmailPermissionsProvider', error });
            return reject(error);
          }

          
          // Trade code → tokens via Edge
          const resp = await fetch('/api/auth/exchange', {
            method: 'POST',
            credentials: 'include',                // sends cookie back
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              redirectUri: window.location.origin   // must match OAuth config
            }),
          });

          if (!resp.ok) {
            const msg = await resp.text();
            logger.error('Exchange failed', { component: 'GmailPermissionsProvider', error: msg });
            return reject(msg);
          }

          const { access_token, expires_in } = await resp.json();

          // 1) Put it in memory for immediate use
          primeAccessToken(access_token, expires_in);

          // Record which mailbox this token opens, clearing another inbox's
          // analysis if that is what just got replaced.
          const ok = await registerConnectedInbox(access_token);
          if (!ok) return reject('inbox_unidentified');

          // Kick off stats fetch, update UI, etc.
          updateTokenStatus();
          fetchGmailStats(access_token).catch((error: unknown) => {
            logger.error('Failed to fetch Gmail stats', { 
              component: 'GmailPermissionsProvider', 
              error: error instanceof Error ? error.message : String(error)
            });
          });

          resolve(true);
        },
      });

      // Opens the popup
      codeClient.requestCode();
    });
  }, [isClientLoaded, registerConnectedInbox, updateTokenStatus]);

  /**
   * Hands MailMop over to a different inbox.
   *
   * Drops our token first so Google offers the account chooser, then runs the
   * normal connect flow. Nothing local is cleared here: if the user closes the
   * popup without choosing, they keep the analysis they already had and can
   * reconnect the same mailbox to pick up exactly where they left off. The
   * clearing decision belongs to `registerConnectedInbox`, once we actually know
   * which mailbox was chosen.
   */
  const switchInbox = useCallback(async () => {
    logger.debug('Switching inbox', { component: 'GmailPermissionsProvider' });
    await dropRefreshToken();
    // The connected-inbox marker deliberately stays put. It records who the
    // analysis on this device belongs to, and that is still the previous inbox
    // until Google hands us a different one — `registerConnectedInbox` needs it
    // to tell a switch from a reconnect. Clearing it here is precisely the bug
    // that left one inbox's senders on screen under another inbox's token.
    updateTokenStatus();
    return requestPermissions();
  }, [requestPermissions, updateTokenStatus]);

  useEffect(() => {
    logger.debug('Connected inbox changed', {
      component: 'GmailPermissionsProvider',
      connectedInbox,
      state: permissionState
    });
  }, [connectedInbox, permissionState]);

  const clearToken = useCallback(async () => {
    await revokeAndClearToken();
    // Revoking access does not delete the analysis, so the marker stays too —
    // those senders still belong to that mailbox, and connecting a different one
    // later has to be able to notice.
    updateTokenStatus();
    window.dispatchEvent(new CustomEvent(TOKEN_CHANGE_EVENT, { detail: { key: 'token' } }));
  }, [updateTokenStatus]);

  // --- Testing functions ---
  const clearAccessTokenOnly = useCallback(async () => {
    // This function is intended for testing/debugging ONLY.
    // It clears the access token but leaves the refresh token.
    logger.warn('[GmailPermissionsProvider] TEST: Clearing access token only.');
    await clearAccessTokenOnlyInStorage();
    updateTokenStatus(); // Refresh UI state
    window.dispatchEvent(new CustomEvent(TOKEN_CHANGE_EVENT, { detail: { key: 'token' } }));
  }, [updateTokenStatus]);

  const expireAccessToken = useCallback(async () => {
    // This function is intended for testing/debugging ONLY.
    // It sets the current access token to expire in 1 minute.
    logger.warn('[GmailPermissionsProvider] TEST: Expiring access token in 1 minute.');
    await expireAccessTokenInStorage(); // Assumes this function modifies the stored token's expiry
    updateTokenStatus(); // Refresh UI state
    window.dispatchEvent(new CustomEvent(TOKEN_CHANGE_EVENT, { detail: { key: 'token' } }));
  }, [updateTokenStatus]);
  // --- End Testing functions ---

  // Check if token can survive a given duration
  const canTokenSurvive = useCallback((durationMs: number): boolean => {
    return tokenStatus.timeRemaining > durationMs;
  }, [tokenStatus.timeRemaining]);

  // Get detailed token run status
  const getTokenRunStatus = useCallback((durationMs: number): TokenRunStatus => {
    if (!tokenStatus.isValid) return 'expired';
    return canTokenSurvive(durationMs) ? 'will_survive' : 'will_expire';
  }, [tokenStatus.isValid, canTokenSurvive]);

  // Get access token for API calls (uses the lib's getAccessToken)
  const getAccessTokenForAPI = useCallback(async (): Promise<string> => {
    try {
      return await libGetAccessToken();
    } catch (error) {
      updateTokenStatus();
      throw error;
    }
  }, [updateTokenStatus]);

  // Force refresh access token for API calls (uses the lib's forceRefreshAccessToken)
  const forceRefreshAccessTokenForAPI = useCallback(async (): Promise<string> => {
    try {
      return await libForceRefreshAccessToken();
    } catch (error) {
      updateTokenStatus();
      throw error;
    }
  }, [updateTokenStatus]);

  // Peek access token (uses the lib's peekAccessToken)
  const peekAccessTokenForContext = useCallback(() => {
    return libPeekAccessToken();
  }, []);

  // Get token time remaining (uses the lib's tokenTimeRemaining)
  const tokenTimeRemainingForContext = useCallback(() => {
    return libTokenTimeRemaining();
  }, []);

  const contextValue: GmailPermissionsContextType = {
    ...permissionState,
    isLoading,
    isClientLoaded,
    requestPermissions,
    connectedInbox,
    switchInbox,
    clearToken,
    tokenStatus,
    canTokenSurvive,
    getTokenRunStatus,
    getAccessToken: getAccessTokenForAPI,
    forceRefreshAccessToken: forceRefreshAccessTokenForAPI,
    peekAccessToken: peekAccessTokenForContext,
    tokenTimeRemaining: tokenTimeRemainingForContext,
    hasRefreshToken: libHasRefreshToken(),
    clearAccessTokenOnly,
    expireAccessToken,
    refreshTokenState: getRefreshTokenState(),
  };

  return (
    <GmailPermissionsContext.Provider value={contextValue}>
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