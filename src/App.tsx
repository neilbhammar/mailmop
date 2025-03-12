import { useState, useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./components/auth/LoginPage";
import EmailAnalyzer from "./components/email/EmailAnalyzer";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for cached token on component mount
  useEffect(() => {
    const cachedToken = localStorage.getItem("googleToken");
    if (cachedToken) {
      setAccessToken(cachedToken);
      if (location.pathname === "/") {
        navigate("/dashboard");
      }
    }
  }, [navigate, location.pathname]);

  // At the beginning of your App component, add:
  useEffect(() => {
    // Check if we need to perform a token check at app start
    if (location.pathname === '/dashboard') {
      const cachedToken = localStorage.getItem("googleToken");
      if (cachedToken) {
        console.log("Found token for dashboard route, setting access token");
        setAccessToken(cachedToken);
      } else {
        console.log("No token found but on dashboard route, redirecting to login");
        navigate('/');
      }
    }
  }, [location.pathname]);

  const handleSignIn = (token: string) => {
    console.log("SignIn Token:", token);
    setAccessToken(token);
    localStorage.setItem("googleToken", token);
    navigate("/dashboard");
  };

  const handleSignOut = () => {
    setAccessToken(null);
    localStorage.removeItem("googleToken");
    localStorage.removeItem("mailmop_summary");
    localStorage.removeItem("mailmop_email_counts");
    console.log("User signed out");
    navigate("/");
  };

  // Directly revoke the token using Google's revocation endpoint
  const revokeToken = async (token: string) => {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.ok) {
        console.log("Token successfully revoked");
        return true;
      } else {
        console.error("Failed to revoke token:", await response.text());
        return false;
      }
    } catch (error) {
      console.error("Error revoking token:", error);
      return false;
    }
  };

  // Force a complete re-authentication by revoking access and redirecting to Google's permissions page
  const handleForceReauth = async () => {
    // First try to revoke the current token if we have one
    if (accessToken) {
      await revokeToken(accessToken);
    }
    
    // Sign out
    handleSignOut();
    
    // Clear any session cookies that might be storing the authorization
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Redirect to Google's account permissions page where the user can revoke access
    window.open('https://myaccount.google.com/permissions', '_blank');
  };

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!accessToken) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  // Add this new component to handle the OAuth callback
  function OAuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      async function handleCallback() {
        try {
          const urlParams = new URLSearchParams(location.search);
          const code = urlParams.get('code');
          
          if (!code) {
            console.error("No code received from Google");
            setError("Authentication failed - no code received");
            return;
          }

          // Use exact values from Google Cloud Console
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code,
              client_id: 'a1mand26uvfmfcbs8vbngec2n4ckecku.apps.googleusercontent.com',
              client_secret: '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',
              redirect_uri: 'https://mailmop.neilbhammar.com/auth/callback',
              grant_type: 'authorization_code',
            }),
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange failed:', errorData);
            setError(`Failed to get access token: ${errorData}`);
            return;
          }

          const data = await tokenResponse.json();
          
          if (data.access_token) {
            console.log("Successfully received access token");
            localStorage.setItem('googleToken', data.access_token);
            setAccessToken(data.access_token); // Set the token in App state
            navigate('/dashboard', { replace: true });
          } else {
            console.error("No access token in response:", data);
            setError("Failed to get access token");
          }
        } catch (error) {
          console.error('Error in OAuth callback:', error);
          setError("Authentication failed");
        }
      }

      handleCallback();
    }, [location, navigate]);

    if (error) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-red-600">Error: {error}</h2>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Return to Login
          </button>
        </div>
      );
    }

    return <div className="p-4 text-center">Completing sign in...</div>;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={
          accessToken ? <Navigate to="/dashboard" replace /> : <LoginPage onSuccess={handleSignIn} />
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <EmailAnalyzer 
              accessToken={accessToken!} 
              onSignOut={handleSignOut} 
              onResetPermissions={handleForceReauth} 
            />
          </ProtectedRoute>
        } />
        
        <Route path="/auth/callback" element={<OAuthCallback />} />
        
        {/* Catch-all route redirects to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
