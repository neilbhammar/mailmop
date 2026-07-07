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
    }
  
    function initCodeClient(config: CodeClientConfig): CodeClient;
  }
  