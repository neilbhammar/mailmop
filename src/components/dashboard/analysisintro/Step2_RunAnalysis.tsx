'use client'

import { useGmailStats } from '@/hooks/useGmailStats'
import { getStoredToken } from '@/lib/gmail/tokenStorage'

interface Step2Props {
  onStart: () => void;
}

export default function Step2_RunAnalysis({ onStart }: Step2Props) {
  const token = getStoredToken()
  const { stats, isLoading } = useGmailStats(token?.accessToken)
  
  // Rough estimate: 1000 messages per minute
  const estimatedMinutes = stats?.totalEmails ? Math.ceil(stats.totalEmails / 1000) : 2
  
  // Round to nearest thousand
  const roundedEmails = stats?.totalEmails 
    ? Math.floor(stats.totalEmails / 1000) * 1000
    : 0

  return (
    <div className="flex flex-col items-center space-y-8 max-w-xl mx-auto text-center">
      <h3 className="text-2xl font-semibold text-gray-800">
        Ready to analyze your inbox
      </h3>

      <div className="space-y-4">
        <p className="text-gray-600">
          We'll scan your inbox to show you which senders are taking up space. 
          This is local and private.
        </p>

        {/* Stats with placeholder */}
        <div className="min-h-[24px]"> {/* Fixed height container */}
          {isLoading ? (
            <div className="animate-pulse flex justify-center">
              <div className="h-5 bg-gray-200 rounded w-64"></div>
            </div>
          ) : stats?.totalEmails ? (
            <p className="text-sm text-gray-500">
              You have over {(roundedEmails).toLocaleString()} emails.
              This can take up to {estimatedMinutes} minute{estimatedMinutes !== 1 ? 's' : ''}.
            </p>
          ) : null}
        </div>
      </div>

      {/* Analysis settings - we'll add these later */}
      <div className="w-full bg-gray-50 p-6 rounded-lg space-y-4">
        <h4 className="font-medium text-gray-700 text-left">Analysis Settings</h4>
        <p className="text-sm text-gray-500 text-left">
          Configure how you want to analyze your inbox. 
          Default settings work well for most users.
        </p>
      </div>

      <button
        onClick={onStart}
        disabled={isLoading}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Getting inbox size...' : 'Start Analysis'}
      </button>
    </div>
  )
} 