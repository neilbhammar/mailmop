export interface GmailToken {
  accessToken: string;
  expiresAt: number;  // Unix timestamp in milliseconds
}

export interface GmailPermissionState {
  hasToken: boolean;
  isTokenValid: boolean;
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