import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "../ui/button";
import { config } from "../../config";  

interface GoogleLoginButtonProps {
  onSuccess: (token: string) => void;
}

export function GoogleLoginButton({ onSuccess }: GoogleLoginButtonProps) {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("✅ Access Token received:", tokenResponse.access_token.substring(0, 10) + "...");
      
      // Add more detailed logging
      try {
        console.log("Calling onSuccess with token");
        onSuccess(tokenResponse.access_token);
        console.log("onSuccess handler completed");
        
        // Force a page reload after a short delay if navigation isn't working
        setTimeout(() => {
          if (window.location.pathname !== '/dashboard') {
            console.log("Still on landing page, forcing navigation to /dashboard");
            window.location.href = '/dashboard';
          }
        }, 1000);
      } catch (error) {
        console.error("Error in onSuccess handler:", error);
      }
    },
    onError: (errorResponse) => {
      console.error("Google login error:", errorResponse);
    },
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    prompt: "consent",
    flow: "implicit"
  });

  return (
    <Button 
      onClick={() => {
        console.log("Login button clicked");
        login();
      }} 
      className="w-full max-w-xs h-12 flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      <span className="font-medium">Sign in with Google</span>
    </Button>
  );
} 