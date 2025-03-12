import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';

// Import components with correct import style
import LoginPage from './components/auth/LoginPage';
import EmailAnalyzer from './components/email/EmailAnalyzer';
import { AppLayout } from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Rename the local ErrorBoundary component to avoid conflict
function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Caught in error boundary:', event.error);
      setHasError(true);
      setError(event.error);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-600 mb-4">
            {error?.message || 'An unexpected error occurred'}
          </p>
          <pre className="bg-red-100 p-3 rounded text-xs overflow-auto max-h-40 mb-4">
            {error?.stack || 'No stack trace available'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Create a simple redirect component
function RedirectComponent({ to }: { to: string }) {
  console.log(`RedirectComponent: Redirecting to ${to}`);
  
  React.useEffect(() => {
    console.log(`RedirectComponent useEffect: Redirecting to ${to}`);
    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      window.location.href = to;
    }, 100);
    
    return () => clearTimeout(timer);
  }, [to]);
  
  return <div className="text-center p-4">Redirecting to {to}...</div>;
}

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('gmail_access_token')
  );

  const handleSignIn = (token: string) => {
    console.log('Handling sign in with token:', token.substring(0, 10) + '...');
    localStorage.setItem('gmail_access_token', token);
    console.log('Token saved to localStorage');
    setAccessToken(token);
    console.log('Access token state updated, should redirect soon...');
    
    // Force a redirect after a short delay as a fallback
    setTimeout(() => {
      if (window.location.pathname !== '/dashboard') {
        console.log('Forcing redirect to dashboard');
        window.location.href = '/dashboard';
      }
    }, 1000);
  };

  const handleSignOut = () => {
    localStorage.removeItem('gmail_access_token');
    setAccessToken(null);
  };

  const handleResetPermissions = () => {
    localStorage.removeItem('gmail_access_token');
    setAccessToken(null);
    // Clear any other stored permissions or tokens
    window.location.href = '/';
  };

  // Get client ID from environment variable
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <AppErrorBoundary>
      <GoogleOAuthProvider clientId={clientId}>
        <AppLayout>
          <Routes>
            <Route
              path="/"
              element={
                accessToken ? (
                  <RedirectComponent to="/dashboard" />
                ) : (
                  <LoginPage onSignIn={handleSignIn} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute accessToken={accessToken}>
                  <EmailAnalyzer
                    accessToken={accessToken!}
                    onResetPermissions={handleResetPermissions}
                    onSignOut={handleSignOut}
                  />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RedirectComponent to="/" />} />
          </Routes>
        </AppLayout>
      </GoogleOAuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
