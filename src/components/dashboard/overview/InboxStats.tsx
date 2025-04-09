import React from 'react';
import { useGmailStats } from '@/hooks/useGmailStats';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { getStoredToken } from '@/lib/gmail/tokenStorage';
import { useActionStats } from '@/hooks/useActionStats';
import { useUser } from '@supabase/auth-helpers-react';
import { cn } from '@/lib/utils';

export default function InboxStats() {
  const token = getStoredToken();
  const { stats: gmailStats, isLoading: gmailLoading } = useGmailStats(token?.accessToken);
  const user = useUser();
  const { stats: actionStats, isLoading: actionsLoading } = useActionStats(user?.id);

  // Consider the whole component loading if either data source is loading
  const isLoading = gmailLoading || actionsLoading;

  // Only show action stats if we have non-zero values
  const showAnalyzed = !isLoading && actionStats?.analyzed > 0;
  const showDeleted = !isLoading && actionStats?.deleted > 0;

  return (
    <div className="mt-4 h-[42px]">
      <div className={cn(
        "flex items-center gap-8 text-sm transition-all duration-300",
        isLoading ? "opacity-0" : "opacity-100"
      )}>
        {/* Total Emails - Always show */}
        <div>
          <span className="text-slate-500">Total Emails</span>
          <p className="font-medium text-slate-800 h-6 flex items-center">
            {gmailStats?.totalEmails.toLocaleString() || '0'}
          </p>
        </div>

        {/* Threads - Always show */}
        <div>
          <span className="text-slate-500">Threads</span>
          <p className="font-medium text-slate-800 h-6 flex items-center">
            {gmailStats?.totalThreads.toLocaleString() || '0'}
          </p>
        </div>

        {/* Analyzed - Only show if we have non-zero data */}
        {showAnalyzed && (
          <div>
            <span className="text-slate-500">Analyzed</span>
            <p className="font-medium text-slate-800 h-6 flex items-center">
              {actionStats.analyzed.toLocaleString()}
            </p>
          </div>
        )}

        {/* Deleted - Only show if we have non-zero data */}
        {showDeleted && (
          <div>
            <span className="text-slate-500">Deleted</span>
            <p className="font-medium text-slate-800 h-6 flex items-center">
              {actionStats.deleted.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
