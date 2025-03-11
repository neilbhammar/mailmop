import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
console.log("Loaded Google Client ID:", clientId); // Debugging line

if (!clientId) {
  console.error("❌ Missing Google Client ID! Check your .env.local file.");
  // Render an error message instead of crashing
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <div style={{ padding: "20px", color: "red" }}>
      <h1>Configuration Error</h1>
      <p>Missing Google Client ID. Please check your .env.local file.</p>
    </div>
  );
} else {
  // Only render the app if we have a client ID
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}
