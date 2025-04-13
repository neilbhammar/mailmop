export interface GmailToken {
  accessToken: string;
  expiresAt: number;  // Unix timestamp in milliseconds
}

export interface TokenStatus {
  isValid: boolean;
  expiresAt: number | null;
  timeRemaining: number;
  state: 'valid' | 'expiring_soon' | 'expired';
}

// Runtime status for token operations
export type TokenRunStatus = 'will_survive' | 'will_expire' | 'expired';

export interface TokenStatusOptions {
  durationMs?: number;           // How long the token needs to remain valid
  expiringSoonThresholdMs?: number;  // Threshold for "expiring soon" state
}

export interface GmailPermissionState {
  hasToken: boolean;
  hasEmailData: boolean;
}

// Google OAuth Types
export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

export interface GoogleTokenClient {
  requestAccessToken(): void;
}

export interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  login_hint?: string; // Optional email to pre-fill in the Google account selector
}

// Declare global Google namespace
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

// Analysis Types
export interface CachedAnalysis {
  timestamp: number;
  senders: SenderSummary[];
}

export interface SenderSummary {
  email: string;
  name: string;
  messageCount: number;
  lastMessageDate: string;
  // Add other summary fields as needed
}

export interface SenderResult {
  senderEmail: string;        // Primary Key
  senderName: string;
  count: number;
  lastDate: string;
  analysisId: string;         // Associates sender with a specific analysis

  sampleSubjects?: string[];
  messageIds?: string[];
  hasUnsubscribe?: boolean;
  unsubscribe?: {
    mailto?: string;
    url?: string;
    requiresPost?: boolean;
  };
} 