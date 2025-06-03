import { useGmailPermissions } from '@/context/GmailPermissionsProvider';

export function GrantPermissionsModal() {
  const { requestPermissions, isLoading } = useGmailPermissions();

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Grant Gmail Access
          </h2>
          <p className="text-gray-600 dark:text-slate-400">
            To help you analyze and clean your inbox, MailMop needs permission to:
          </p>
          <ul className="list-disc pl-5 text-gray-600 dark:text-slate-400 space-y-2">
            <li>Read your email metadata (subject lines and senders)</li>
            <li>Modify emails (for deletion and organization)</li>
            <li>Create filters (for blocking senders)</li>
          </ul>
          <p className="text-gray-600 dark:text-slate-400 mt-4">
            We never read email content or store emails on our servers. All analysis happens in your browser.
          </p>
        </div>

        <button
          onClick={requestPermissions}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-700"
        >
          {isLoading ? 'Granting Access...' : 'Grant Access'}
        </button>
      </div>
    </div>
  );
} 