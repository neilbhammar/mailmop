import { useState } from "react";
import GoogleLoginButton from "./components/GoogleLoginButton";
import EmailFetcher from "./components/EmailFetcher";
import "./App.css";

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleSignOut = () => {
    setAccessToken(null);
    // Clear any cached tokens or state
    localStorage.removeItem("googleToken");
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
    setAccessToken(null);
    localStorage.removeItem("googleToken");
    
    // Clear any session cookies that might be storing the authorization
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Redirect to Google's account permissions page where the user can revoke access
    window.open('https://myaccount.google.com/permissions', '_blank');
    
    // Show instructions to the user
    alert('Please follow these steps in the new tab:\n\n1. Find "MailMop" in the list of apps\n2. Click on it and select "Remove Access"\n3. Return to this page and sign in again');
    
    console.log("Redirecting to Google permissions page for manual revocation");
  };

  return (
    <div className="app-container">
      <h1>MailMop</h1>
      
      {!accessToken ? (
        <div className="login-container">
          <p className="app-description">
            Analyze your Gmail inbox to discover who sends you the most emails.
          </p>
          <GoogleLoginButton onSuccess={(token) => setAccessToken(token)} />
          <button 
            onClick={handleForceReauth} 
            className="force-reauth-button"
          >
            Force New Authorization
          </button>
          <p className="reauth-note">
            Use this if you're experiencing permission issues with filters.
          </p>
        </div>
      ) : (
        <div className="main-content">
          <div className="header-actions">
            <button onClick={handleForceReauth} className="force-reauth-button">
              Reset Permissions
            </button>
            <button onClick={handleSignOut} className="sign-out-button">
              Sign Out
            </button>
          </div>
          <EmailFetcher accessToken={accessToken} />
        </div>
      )}
    </div>
  );
}

export default App;
