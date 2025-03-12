import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

// Get client ID securely
const clientId = (() => {
  // Try to get from env var first
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (envClientId) {
    console.log("Using client ID from environment");
    return envClientId;
  }
  
  // Fallback option (still secure as OAuth client IDs are meant to be public)
  console.warn("Environment variable missing, using fallback client ID");
  return '179016010492-a1mand26uvfmfcbs8vbngec2n4ckecku.apps.googleusercontent.com';
})();

// Wrap the app rendering in a try/catch to prevent white screens
try {
  ReactDOM.render(
    <React.StrictMode>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={clientId}>
          <App />
        </GoogleOAuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
    document.getElementById("root")
  );
} catch (error) {
  console.error("Error rendering application:", error);
  // Render a fallback UI instead of white screen
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h1>Something went wrong</h1>
        <p>The application couldn't load correctly. Please try refreshing the page.</p>
        <button onclick="window.location.reload()">Refresh Page</button>
      </div>
    `;
  }
}
