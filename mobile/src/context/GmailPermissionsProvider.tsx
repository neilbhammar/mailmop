import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import {
  GmailPermissionState,
  TokenStatus,
  TokenRunStatus,
  TokenStatusOptions,
} from '@/types/gmail';
import { fetchGmailProfile } from '@/lib/gmail/fetchProfile';
import { useAuth } from './AuthProvider';
import { GMAIL_SCOPES } from '@shared/constants/scopes';
import { TOKEN_CHANGE_EVENT } from '@shared/constants/events';
import { eventBus } from '@/lib/events';
import {
  primeAccessToken,
  getAccessToken as libGetAccessToken,
  peekAccessToken as libPeekAccessToken,
  tokenTimeRemaining as libTokenTimeRemaining,
  revokeAndClearToken,
  hasRefreshToken as libHasRefreshToken,
  initializeTokenState,
  forceRefreshAccessToken as libForceRefreshAccessToken,
  getRefreshTokenState,
  exchangeAuthCode,
} from '@/lib/gmail/token';
import { config, getGmailRedirectUri } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_EXPIRING_SOON_MS = 5 * 60 * 1000;

interface GmailPermissionsContextType extends GmailPermissionState {
  isLoading: boolean;
  requestPermissions: () => Promise<boolean>;
  shouldShowMismatchModal: boolean;
  gmailEmail: string | null;
  clearToken: () => Promise<void>;
  tokenStatus: TokenStatus;
  canTokenSurvive: (durationMs: number) => boolean;
  getTokenRunStatus: (durationMs: number) => TokenRunStatus;
  getAccessToken: () => Promise<string>;
  forceRefreshAccessToken: () => Promise<string>;
  peekAccessToken: () => { accessToken: string; expiresAt: number } | null;
  tokenTimeRemaining: () => number;
  hasRefreshToken: boolean;
  hideMismatchModal: () => void;
  refreshTokenState: 'unknown' | 'present' | 'absent';
}

const GmailPermissionsContext = createContext<GmailPermissionsContextType | null>(null);

function computeTokenStatus(
  peek: ReturnType<typeof libPeekAccessToken>,
  hasRefresh: boolean,
  expiringSoonMs: number
): TokenStatus {
  if (!hasRefresh) {
    return {
      isValid: false,
      expiresAt: null,
      timeRemaining: 0,
      state: 'no_connection',
    };
  }

  if (!peek) {
    return {
      isValid: false,
      expiresAt: null,
      timeRemaining: 0,
      state: 'expired',
    };
  }

  const timeRemaining = peek.expiresAt - Date.now();
  if (timeRemaining <= 0) {
    return {
      isValid: false,
      expiresAt: peek.expiresAt,
      timeRemaining: 0,
      state: 'expired',
    };
  }

  if (timeRemaining <= expiringSoonMs) {
    return {
      isValid: true,
      expiresAt: peek.expiresAt,
      timeRemaining,
      state: 'expiring_soon',
    };
  }

  return {
    isValid: true,
    expiresAt: peek.expiresAt,
    timeRemaining,
    state: 'valid',
  };
}

export function GmailPermissionsProvider({
  children,
  expiringSoonThresholdMs = DEFAULT_EXPIRING_SOON_MS,
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
    state: 'initializing',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [shouldShowMismatchModal, setShouldShowMismatchModal] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [refreshTokenState, setRefreshTokenState] = useState(getRefreshTokenState());

  const redirectUri = getGmailRedirectUri();

  const [, , promptAsync] = Google.useAuthRequest({
    iosClientId: config.googleClientId,
    androidClientId: config.googleClientId,
    webClientId: config.googleClientId,
    scopes: GMAIL_SCOPES.split(' '),
    redirectUri,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    },
  });

  const refreshStatus = useCallback(() => {
    const hasRefresh = libHasRefreshToken();
    const peek = libPeekAccessToken();
    setRefreshTokenState(getRefreshTokenState());
    setPermissionState({
      hasToken: hasRefresh,
      hasEmailData: permissionState.hasEmailData,
    });
    setTokenStatus(computeTokenStatus(peek, hasRefresh, expiringSoonThresholdMs));
  }, [expiringSoonThresholdMs, permissionState.hasEmailData]);

  useEffect(() => {
    initializeTokenState().then(refreshStatus);
    return eventBus.on(TOKEN_CHANGE_EVENT, refreshStatus);
  }, [refreshStatus]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;
    setIsLoading(true);

    try {
      const result = await promptAsync();
      if (result.type !== 'success' || !result.params.code) {
        return false;
      }

      await exchangeAuthCode(result.params.code, redirectUri);
      const accessToken = await libGetAccessToken();
      const profile = await fetchGmailProfile(accessToken);

      if (profile.emailAddress.toLowerCase() !== user.email!.toLowerCase()) {
        setGmailEmail(profile.emailAddress);
        setShouldShowMismatchModal(true);
        await revokeAndClearToken();
        return false;
      }

      setGmailEmail(profile.emailAddress);
      setPermissionState({ hasToken: true, hasEmailData: true });
      refreshStatus();
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, promptAsync, redirectUri, refreshStatus]);

  const clearToken = useCallback(async () => {
    await revokeAndClearToken();
    setGmailEmail(null);
    setPermissionState({ hasToken: false, hasEmailData: false });
    refreshStatus();
  }, [refreshStatus]);

  const hideMismatchModal = useCallback(() => setShouldShowMismatchModal(false), []);

  const canTokenSurvive = useCallback(
    (durationMs: number) => {
      const peek = libPeekAccessToken();
      if (!peek) return libHasRefreshToken();
      return peek.expiresAt - Date.now() >= durationMs;
    },
    []
  );

  const getTokenRunStatus = useCallback((durationMs: number): TokenRunStatus => {
    const peek = libPeekAccessToken();
    if (!peek) return libHasRefreshToken() ? 'will_expire' : 'expired';
    const remaining = peek.expiresAt - Date.now();
    if (remaining <= 0) return 'expired';
    return remaining >= durationMs ? 'will_survive' : 'will_expire';
  }, []);

  return (
    <GmailPermissionsContext.Provider
      value={{
        ...permissionState,
        isLoading,
        requestPermissions,
        shouldShowMismatchModal,
        gmailEmail,
        clearToken,
        tokenStatus,
        canTokenSurvive,
        getTokenRunStatus,
        getAccessToken: libGetAccessToken,
        forceRefreshAccessToken: libForceRefreshAccessToken,
        peekAccessToken: libPeekAccessToken,
        tokenTimeRemaining: libTokenTimeRemaining,
        hasRefreshToken: libHasRefreshToken(),
        hideMismatchModal,
        refreshTokenState,
      }}
    >
      {children}
    </GmailPermissionsContext.Provider>
  );
}

export function useGmailPermissions() {
  const ctx = useContext(GmailPermissionsContext);
  if (!ctx) throw new Error('useGmailPermissions must be used within GmailPermissionsProvider');
  return ctx;
}
