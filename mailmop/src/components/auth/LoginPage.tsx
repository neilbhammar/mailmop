import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { GoogleLoginButton } from './GoogleLoginButton';
import { Button } from '../ui/button';
import { useToast } from '../../lib/use-toast';

interface LoginPageProps {
  onSuccess: (token: string) => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [isResettingAuth, setIsResettingAuth] = useState(false);
  const { toast } = useToast();

  // Force a complete re-authentication by redirecting to Google's permissions page
  const handleForceReauth = async () => {
    setIsResettingAuth(true);
    
    // Clear any session cookies that might be storing the authorization
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Redirect to Google's account permissions page where the user can revoke access
    window.open('https://myaccount.google.com/permissions', '_blank');
    
    // Show instructions to the user
    toast({
      title: "Reset Permissions",
      description: "Please find 'MailMop' in the list of apps, click on it and select 'Remove Access', then return to this page and sign in again.",
      duration: 10000,
    });
    
    console.log("Redirecting to Google permissions page for manual revocation");
    
    setTimeout(() => {
      setIsResettingAuth(false);
    }, 3000);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-2rem)] bg-background">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-2 pb-6">
          <div className="w-48 h-30 mx-auto mb-1">
            <img src="/images/logo.png" alt="MailMop Logo" className="w-full h-full object-contain" />
          </div>
          <CardDescription className="text-center text-base">
          Clean your inbox by identifying who's cluttering it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 pb-8">
          <GoogleLoginButton onSuccess={onSuccess} />
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            MailMop runs totally entirely on your browser - your data doesn't leave your device. Our code is open source and available on <a href="https://github.com/neilbhammar/mailmop" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GitHub</a>.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-0 pb-6">
          <Button 
            variant="link" 
            size="sm" 
            onClick={handleForceReauth}
            disabled={isResettingAuth}
            className="text-xs text-muted-foreground"
          >
            {isResettingAuth ? "Opening permissions page..." : "Having trouble? Reset permissions"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
