import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    // Parse the URL hash for access token
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
      console.log('Access token received in callback:', accessToken.substring(0, 10) + '...');
      
      // Get redirect path from session storage
      const redirectPath = sessionStorage.getItem('auth_redirect') || '/';
      sessionStorage.removeItem('auth_redirect');
      
      // Store token and redirect
      localStorage.setItem('gmail_access_token', accessToken);
      
      // Use window.location instead of navigate
      window.location.href = redirectPath;
    } else {
      console.error('No access token found in redirect');
      // Handle auth error - redirect to home
      window.location.href = '/';
    }
  }, []);
  
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Completing authentication...</p>
    </div>
  );
} 