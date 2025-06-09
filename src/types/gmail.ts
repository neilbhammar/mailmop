export interface GmailToken {
  accessToken: string;
  expiresAt: number;  // Unix timestamp in milliseconds
}

export interface TokenStatus {
  isValid: boolean;
  expiresAt: number | null;
  timeRemaining: number;
  state: 'valid' | 'expiring_soon' | 'expired' | 'no_connection' | 'initializing';
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

// Gmail Label Types
export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility?: 'hide' | 'show';
  labelListVisibility?: 'labelHide' | 'labelShow' | 'labelShowIfUnread';
  type?: 'system' | 'user';
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface CreateLabelRequest {
  name: string;
  messageListVisibility?: 'hide' | 'show';
  labelListVisibility?: 'labelHide' | 'labelShow' | 'labelShowIfUnread';
  color?: {
    textColor: string;
    backgroundColor: string;
  };
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
  senderEmail: string;
  senderName: string;
  // Optional array to store all names used by this sender (for Option 1 tooltip)
  senderNames?: string[];
  count: number;
  unread_count: number;
  lastDate: string;
  analysisId: string;
  hasUnsubscribe: boolean;
  unsubscribe?: {
    // Original header data (can be overwritten freely during analysis)
    mailto?: string;
    url?: string;
    requiresPost?: boolean;
    
    // Enriched data (append-only, never overwritten)
    enrichedUrl?: string;        // Working HTTP unsubscribe link from email body
    enrichedAt?: number;         // Timestamp of enrichment
    firstMessageId?: string;     // Message ID for enrichment (captured during analysis)
  };
  actionsTaken?: string[];
  messageIds?: string[];
  sampleSubjects?: string[];
} 

