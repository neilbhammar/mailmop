import React from 'react';

interface ProtectedRouteProps {
  accessToken: string | null;
  children: React.ReactNode;
}

// Change to use window.location instead of Navigate component
export default function ProtectedRoute({ accessToken, children }: ProtectedRouteProps) {
  // If no access token, redirect to home page
  React.useEffect(() => {
    if (!accessToken) {
      window.location.href = '/';
    }
  }, [accessToken]);

  // If no access token, render nothing while redirect happens
  if (!accessToken) {
    return null;
  }
  
  // Otherwise render children
  return <>{children}</>;
} 