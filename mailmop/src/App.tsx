import { useState } from "react";
import GoogleLoginButton from "./components/GoogleLoginButton";
import EmailFetcher from "./components/EmailFetcher";

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  return (
    <div>
      <h1>MailMop</h1>
      {!accessToken ? (
        <GoogleLoginButton onSuccess={(token) => setAccessToken(token)} />
      ) : (
        <EmailFetcher accessToken={accessToken} />
      )}
    </div>
  );
}

export default App;
