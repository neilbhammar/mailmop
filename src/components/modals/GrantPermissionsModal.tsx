import { useGmailPermissions } from '@/hooks/useGmailPermissions';

export function GrantPermissionsModal() {
  const { requestPermissions } = useGmailPermissions();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Grant Gmail Access
          </h2>
          <p className="text-gray-600">
            To help you analyze and clean your inbox, MailMop needs permission to:
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-2">
            <li>Read your email metadata (subject lines and senders)</li>
            <li>Modify emails (for deletion and organization)</li>
            <li>Create filters (for blocking senders)</li>
          </ul>
          <p className="text-gray-600 mt-4">
            We never read email content or store emails on our servers. All analysis happens in your browser.
          </p>
        </div>

        <button
          onClick={requestPermissions}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Grant Access
        </button>
      </div>
    </div>
  );
} 