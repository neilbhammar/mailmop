import React from 'react';
import { useGmailStats } from '@/hooks/useGmailStats';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { getStoredToken } from '@/lib/gmail/tokenStorage';
import { useActionStats } from '@/hooks/useActionStats';
import { useUser } from '@supabase/auth-helpers-react';

export default function InboxStats() {
  const token = getStoredToken();
  const { stats: gmailStats, isLoading: gmailLoading } = useGmailStats(token?.accessToken);
  const user = useUser();
  const { stats: actionStats, isLoading: actionsLoading } = useActionStats(user?.id);

  console.log('User ID:', user?.id);
  console.log('Action Stats:', actionStats);

  return (
    <div className="mt-4 flex items-center gap-8 text-sm">
      <div>
        <span className="text-slate-500">Total Emails</span>
        <p className="font-medium text-slate-800">
          {gmailLoading ? (
            <span className="inline-block w-12 h-5 bg-slate-200 animate-pulse rounded" />
          ) : (
            gmailStats?.totalEmails.toLocaleString() || '0'
          )}
        </p>
      </div>

      <div>
        <span className="text-slate-500">Threads</span>
        <p className="font-medium text-slate-800">
          {gmailLoading ? (
            <span className="inline-block w-12 h-5 bg-slate-200 animate-pulse rounded" />
          ) : (
            gmailStats?.totalThreads.toLocaleString() || '0'
          )}
        </p>
      </div>
          {/* Only show Analyzed stat if greater than 0 AND not loading */}
          {!actionsLoading && actionStats?.analyzed > 0 && (
            <div>
              <span className="text-slate-500">Analyzed</span>
              <p className="font-medium text-slate-800">{actionStats.analyzed.toLocaleString()}</p>
            </div>
          )}
    
          {/* Only show Deleted stat if greater than 0 AND not loading */}
          {!actionsLoading && actionStats?.deleted > 0 && (
            <div>
              <span className="text-slate-500">Deleted</span>
              <p className="font-medium text-slate-800">{actionStats.deleted.toLocaleString()}</p>
            </div>
          )}
    </div>
  );
}
