import { useGoogleLogin } from "@react-oauth/google";

export default function GoogleLoginButton({ onSuccess }: { onSuccess: (token: string) => void }) {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("✅ Access Token:", tokenResponse.access_token);
      onSuccess(tokenResponse.access_token); // Send token to App.tsx
    },
    scope: "https://www.googleapis.com/auth/gmail.metadata",
  });

  return (
    <div>
      <button onClick={() => login()}>Sign in with Google</button>
    </div>
  );
}
