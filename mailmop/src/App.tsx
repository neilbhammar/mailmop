import { useState, useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./components/auth/LoginPage";
import EmailAnalyzer from "./components/email/EmailAnalyzer";

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check for cached token on component mount
  useEffect(() => {
    const cachedToken = localStorage.getItem("googleToken");
    if (cachedToken) {
      setAccessToken(cachedToken);
    }
  }, []);

  const handleSignIn = (token: string) => {
    setAccessToken(token);
    // Cache the token
    localStorage.setItem("googleToken", token);
    console.log("User signed in");
  };

  const handleSignOut = () => {
    setAccessToken(null);
    // Clear cached token and data
    localStorage.removeItem("googleToken");
    localStorage.removeItem("mailmop_summary");
    localStorage.removeItem("mailmop_email_counts");
    console.log("User signed out");
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

  return (
    <AppLayout>
      {!accessToken ? (
        <LoginPage onSuccess={handleSignIn} />
      ) : (
        <EmailAnalyzer 
          accessToken={accessToken} 
          onSignOut={handleSignOut} 
          onResetPermissions={handleForceReauth} 
        />
      )}
    </AppLayout>
  );
}

export default App;
