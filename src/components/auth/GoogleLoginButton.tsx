import React from 'react';
import { Button } from '../ui/button';
import { useState } from "react";
import { config } from "../../config";

interface GoogleLoginButtonProps {
  onSuccess: (token: string) => void;
}

export default function GoogleLoginButton({ onSuccess }: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get Google client ID from environment
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  const handleLogin = () => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Store current path in sessionStorage to redirect back after auth
      sessionStorage.setItem('auth_redirect', window.location.pathname);
      
      // Build Google OAuth URL manually with redirect
      const protocol = window.location.protocol;
      const redirectUri = `${protocol}//${window.location.host}/auth-callback`;
      const scope = 'https://www.googleapis.com/auth/gmail.readonly';
      const responseType = 'token';
      const state = Math.random().toString(36).substring(2, 15);
      
      // Construct authorization URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=${responseType}&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&prompt=consent`;
      
      // Redirect to Google auth
      window.location.href = authUrl;
    } catch (e) {
      console.error('Login execution error:', e);
      setIsLoading(false);
      setError("Failed to start login process. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Button 
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full max-w-xs h-12 flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span className="font-medium">{isLoading ? "Signing in..." : "Sign in with Google"}</span>
      </Button>
      
      {error && (
        <p className="text-red-500 mt-2 text-sm">{error}</p>
      )}
    </div>
  );
}

// Update type declaration for Google API
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: 'redirect';
            redirect_uri: string;
            state?: string;
          }) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
} 