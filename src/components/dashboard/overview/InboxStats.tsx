import React, { useEffect, useState } from 'react';
import { useGmailStats } from '@/hooks/useGmailStats';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { peekAccessToken } from '@/lib/gmail/token';
import { useActionStats } from '@/hooks/useActionStats';
import { useAuth } from '@/context/AuthProvider';
import { cn } from '@/lib/utils';
import { GMAIL_STATS_UPDATED_EVENT, GmailStats, getStoredGmailStats } from '@/lib/gmail/fetchGmailStats';

export default function InboxStats() {
  const peek = peekAccessToken();
  const { tokenStatus } = useGmailPermissions();
  const { stats: gmailStats, isLoading: gmailLoading, refreshStats, error } = useGmailStats(peek?.accessToken);
  const [forceUpdate, setForceUpdate] = useState(0);
  const { user } = useAuth();
  const { stats: actionStats, isLoading: actionsLoading } = useActionStats(user?.id);

  // Only refresh stats if we have a valid token and either:
  // 1. There was an error
  // 2. We don't have stats yet
  // 3. Force update was triggered
  useEffect(() => {
    if (peek?.accessToken && tokenStatus.state === 'valid' && (!gmailStats || error)) {
      refreshStats(peek.accessToken);
    }
  }, [peek?.accessToken, tokenStatus.state, gmailStats, error, refreshStats, forceUpdate]);

  // Listen for Gmail stats updates
  useEffect(() => {
    const handleStatsUpdated = (event: Event) => {
      if (event instanceof CustomEvent) {
        console.log('[InboxStats] Received Gmail stats update event');
        setForceUpdate(prev => prev + 1);
      }
    };

    window.addEventListener(GMAIL_STATS_UPDATED_EVENT, handleStatsUpdated);
    return () => window.removeEventListener(GMAIL_STATS_UPDATED_EVENT, handleStatsUpdated);
  }, []);

  // Consider the whole component loading if either data source is loading
  const isLoading = gmailLoading || actionsLoading;

  // Only show action stats if we have non-zero values
  const showAnalyzed = actionStats?.analyzed > 0;
  const showDeleted = actionStats?.deleted > 0;
  const showModified = actionStats?.modified > 0;

  // Helper to format numbers or show placeholder
  const formatNumber = (value: number | undefined) => {
    if (isLoading) return '—';
    if (value === undefined) return '—';
    return value.toLocaleString();
  };

  return (
    <div className="mt-4 h-[42px]">
      <div className="flex items-center gap-8 text-sm transition-all duration-300">
        {/* Total Emails - Always show */}
        <div>
          <span className="text-slate-500 dark:text-slate-400">Total Emails</span>
          <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
            {formatNumber(gmailStats?.totalEmails)}
          </p>
        </div>

        {/* Threads - Always show */}
        <div>
          <span className="text-slate-500 dark:text-slate-400">Threads</span>
          <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
            {formatNumber(gmailStats?.totalThreads)}
          </p>
        </div>

        {/* Analyzed - Only show if we have non-zero data */}
        {showAnalyzed && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">Analyzed</span>
            <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
              {formatNumber(actionStats?.analyzed)}
            </p>
          </div>
        )}

        {/* Deleted - Only show if we have non-zero data */}
        {showDeleted && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">Deleted</span>
            <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
              {formatNumber(actionStats?.deleted)}
            </p>
          </div>
        )}

        {/* Modified - Only show if we have non-zero data */}
        {showModified && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">Modified</span>
            <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
              {formatNumber(actionStats?.modified)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
