import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import axios from "axios";

export default function GoogleLoginButton() {
  const [user, setUser] = useState<string | null>(null);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Access Token:", tokenResponse.access_token);
      setUser(tokenResponse.access_token);
      // In the next step, we'll fetch Gmail metadata using this token
    },
    scope: "https://www.googleapis.com/auth/gmail.metadata",
  });

  return (
    <div>
      <button onClick={() => login()}>Sign in with Google</button>
      {user && <p>Logged in! Token in Console.</p>}
    </div>
  );
}
