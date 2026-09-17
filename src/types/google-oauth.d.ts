// src/types/google-oauth.d.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
declare namespace google.accounts.oauth2 {
    interface CodeClient {
      requestCode(): void;
      // The missing piece
      readonly codeVerifier: string;
    }
  
    interface CodeClientConfig extends ClientConfig {
      ux_mode?: 'popup' | 'redirect';
      callback: (resp: { code?: string; error?: string }) => void;
      /**
       * Fires when the flow ends without ever reaching `callback` — the user
       * closed the popup, or the browser blocked it from opening. Without this,
       * a cancelled consent leaves the caller's promise pending forever.
       */
      error_callback?: (err: { type?: string; message?: string }) => void;
    }
  
    function initCodeClient(config: CodeClientConfig): CodeClient;
  }
  