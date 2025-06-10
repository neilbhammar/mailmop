import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGmailStats } from '@/hooks/useGmailStats';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { peekAccessToken } from '@/lib/gmail/token';
import { useActionStats } from '@/hooks/useActionStats';
import { useAuth } from '@/context/AuthProvider';
import { cn } from '@/lib/utils';
import { GMAIL_STATS_UPDATED_EVENT, GmailStats, getStoredGmailStats } from '@/lib/gmail/fetchGmailStats';

// Helper to format numbers with satisfying animation
function AnimatedNumber({ 
  value, 
  isLoading, 
  suffix = '', 
  flashOnUpdate = false,
  flashColor = 'emerald' // 'emerald' for green flash, 'red' for red flash
}: { 
  value: number | undefined; 
  isLoading: boolean; 
  suffix?: string;
  flashOnUpdate?: boolean;
  flashColor?: 'emerald' | 'red';
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [shouldFlash, setShouldFlash] = useState(false);

  useEffect(() => {
    if (value !== prevValue && value !== undefined && prevValue !== undefined) {
      if (flashOnUpdate) {
        setShouldFlash(true);
        setTimeout(() => setShouldFlash(false), 1200); // 2x longer flash duration
      }
      setPrevValue(value);
    }
  }, [value, prevValue, flashOnUpdate]);

  if (isLoading) {
    return (
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-slate-400"
      >
        —
      </motion.span>
    );
  }

  if (value === undefined) return <span className="text-slate-400">—</span>;

  // Define flash color
  const flashColorValue = flashColor === 'red' ? '#ef4444' : '#10b981';
    
  const bgClass = flashColor === 'red'
    ? "bg-red-100 dark:bg-red-900/30"
    : "bg-emerald-100 dark:bg-emerald-900/30";

  return (
    <motion.span
      key={value} // Force re-render on value change
      initial={{ scale: 1 }}
      animate={shouldFlash ? { 
        scale: [1, 1.1, 1],
        color: [flashColorValue, flashColorValue, flashColorValue]
      } : {
        scale: 1
        // Let CSS handle the color when not flashing
      }}
      style={{
        // When not flashing, clear any inline color to let CSS take over
        color: shouldFlash ? undefined : 'inherit'
      }}
      transition={{ duration: 0.3 }}
      className={cn(
        "transition-all duration-300",
        shouldFlash && `${bgClass} px-1 rounded`
      )}
    >
      {value.toLocaleString()}{suffix}
    </motion.span>
  );
}

export default function InboxStats() {
  const peek = peekAccessToken();
  const { tokenStatus } = useGmailPermissions();
  const { stats: gmailStats, isLoading: gmailLoading, refreshStats, error } = useGmailStats(peek?.accessToken);
  const [forceUpdate, setForceUpdate] = useState(0);
  const { user } = useAuth();
  const { stats: actionStats, isLoading: actionsLoading } = useActionStats(user?.id);

  // Track previous values for flash effects
  const [prevDeleted, setPrevDeleted] = useState<number | undefined>();
  const [prevModified, setPrevModified] = useState<number | undefined>();

  // Update previous values when stats change
  useEffect(() => {
    if (actionStats?.deleted !== prevDeleted) {
      setPrevDeleted(actionStats?.deleted);
    }
    if (actionStats?.modified !== prevModified) {
      setPrevModified(actionStats?.modified);
    }
  }, [actionStats?.deleted, actionStats?.modified, prevDeleted, prevModified]);

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

  return (
    <div className="mt-4 h-[42px]">
      <div className="flex items-center gap-8 text-sm transition-all duration-300">
        {/* Total Emails - Always show */}
        <div>
          <span className="text-slate-500 dark:text-slate-400">Total Emails</span>
          <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
            <AnimatedNumber 
              value={gmailStats?.totalEmails} 
              isLoading={isLoading} 
              flashOnUpdate={true}
              flashColor="red"
            />
          </p>
        </div>

        {/* Threads - Always show */}
        <div>
          <span className="text-slate-500 dark:text-slate-400">Threads</span>
          <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
            <AnimatedNumber 
              value={gmailStats?.totalThreads} 
              isLoading={isLoading} 
              flashOnUpdate={true}
              flashColor="red"
            />
          </p>
        </div>

        {/* Analyzed - Only show if we have non-zero data */}
        {showAnalyzed && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-slate-500 dark:text-slate-400">Analyzed</span>
            <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
              <AnimatedNumber 
                value={actionStats?.analyzed} 
                isLoading={isLoading}
                flashOnUpdate={true}
              />
            </p>
          </motion.div>
        )}

        {/* Deleted - Only show if we have non-zero data */}
        {showDeleted && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <span className="text-slate-500 dark:text-slate-400">Deleted</span>
            <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
              <AnimatedNumber 
                value={actionStats?.deleted} 
                isLoading={isLoading}
                flashOnUpdate={true}
              />
            </p>
          </motion.div>
        )}

        {/* Modified - Only show if we have non-zero data */}
        {showModified && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <span className="text-slate-500 dark:text-slate-400">Modified</span>
            <p className="font-medium text-slate-800 dark:text-slate-100 h-6 flex items-center">
              <AnimatedNumber 
                value={actionStats?.modified} 
                isLoading={isLoading}
                flashOnUpdate={true}
              />
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
