import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { clearToken } from '@/lib/gmail/tokenStorage';

interface EmailMismatchModalProps {
  supabaseEmail: string;
  gmailEmail: string;
}

export function EmailMismatchModal({ supabaseEmail, gmailEmail }: EmailMismatchModalProps) {
  const { requestPermissions } = useGmailPermissions();

  const handleRetry = () => {
    clearToken(); // Clear the invalid token
    requestPermissions(); // Try again with login_hint
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Email Mismatch Detected
          </h2>
          <div className="text-gray-600 space-y-2">
            <p>
              You're signed in as <span className="font-medium">{supabaseEmail}</span> but granted access to a different Gmail account (<span className="font-medium">{gmailEmail}</span>).
            </p>
            <p>
              For security reasons, you must use the same email account for both sign-in and Gmail access.
            </p>
          </div>
        </div>

        <button
          onClick={handleRetry}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again with Correct Account
        </button>
      </div>
    </div>
  );
} 