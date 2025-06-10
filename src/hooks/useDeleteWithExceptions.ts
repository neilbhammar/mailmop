/**
 * useDeleteWithExceptions.ts
 * 
 * Hook for handling email deletion with filtering functionality.
 * Similar to useDelete but:
 * 1. Does not mark senders as "deleted" in IndexedDB
 * 2. Supports filter rules for partial deletion
 * 3. Maintains separate progress tracking
 * 4. Support queue integration for centralized task management
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthProvider';

// --- Contexts & Hooks ---
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';

// --- API/Helper Functions ---
import { estimateRuntimeMs, formatDuration } from '@/lib/utils/estimateRuntime';
import { buildQuery, RuleGroup } from '@/lib/gmail/buildQuery';
import { fetchMessageIds } from '@/lib/gmail/fetchMessageIds';
import { batchDeleteMessages } from '@/lib/gmail/batchDeleteMessages';

// --- Storage & Logging ---
import { createActionLog, updateActionLog, completeActionLog } from '@/supabase/actions/logAction';
import {
  createActionLog as createLocalActionLog,
  updateSupabaseLogId,
  updateActionProgress,
  completeActionLog as completeLocalActionLog,
  clearCurrentActionLog,
} from '@/lib/storage/actionLog';
import { updateSenderAfterPartialDeletion, markSenderActionTaken } from '@/lib/storage/senderAnalysis';
import { refreshStatsAfterAction } from '@/lib/utils/updateStats';
import { playSuccessMp3, playBigSuccessMp3 } from '@/lib/utils/sounds';

// --- Types ---
import { ActionEndType } from '@/types/actions';
import { DeleteWithExceptionsJobPayload, ProgressCallback, ExecutorResult } from '@/types/queue';

// --- Constants ---
const TWO_MINUTES_MS = 2 * 60 * 1000;
const DELETION_BATCH_SIZE = 1000;
const BATCH_DELAY_MS = 150;

/** Possible states during the deletion process */
export type DeletingStatus =
  | 'idle'
  | 'preparing'
  | 'deleting'
  | 'completed'
  | 'error'
  | 'cancelled';

/** Detailed progress information for the UI */
export interface DeletingProgress {
  status: DeletingStatus;
  progressPercent: number;
  totalEmailsToProcess: number;
  emailsDeletedSoFar: number;
  currentSender?: string;
  error?: string;
  eta?: string;
}

/** Input format: specify sender email and estimated count */
export interface SenderToDelete {
  email: string;
  count: number;
}

/** State for the re-authentication modal */
interface ReauthModalState {
  isOpen: boolean;
  type: 'expired'; // Simplified type
  eta?: string; // Keep eta for context if needed
}

// --- Helper Functions ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useDeleteWithExceptions() {
  const { user } = useAuth();
  const {
    getAccessToken,
    forceRefreshAccessToken,
    peekAccessToken,
    tokenTimeRemaining,
    hasRefreshToken: isGmailConnected,
    isClientLoaded
    // Removed requestPermissions as it's not directly called now
  } = useGmailPermissions();

  const [progress, setProgress] = useState<DeletingProgress>({
    status: 'idle',
    progressPercent: 0,
    totalEmailsToProcess: 0,
    emailsDeletedSoFar: 0,
  });

  const [reauthModal, setReauthModal] = useState<ReauthModalState>({
    isOpen: false,
    type: 'expired',
  });

  const actionLogIdRef = useRef<string | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Add cancellation ref to avoid React closure issues (critical pattern from analysis)
  const cancellationRef = useRef<boolean>(false);
  const progressRef = useRef<DeletingProgress>({
    status: 'idle',
    progressPercent: 0,
    totalEmailsToProcess: 0,
    emailsDeletedSoFar: 0,
  });

  const updateProgress = useCallback(
    (newProgress: Partial<DeletingProgress>) => {
      setProgress((prev) => {
        const updated = { ...prev, ...newProgress };
        progressRef.current = updated; // Keep ref in sync for queue access
        return updated;
      });
    },
    []
  );

  const closeReauthModal = useCallback(() => {
    console.log('[DeleteWithExceptions] Closing reauth modal');
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const cancelDelete = useCallback(async () => {
    console.log('[DeleteWithExceptions] Cancellation requested');
    isCancelledRef.current = true;
    cancellationRef.current = true; // Also set the queue-compatible ref
    updateProgress({ status: 'cancelled' }); // Pass partial object
    setReauthModal({ isOpen: false, type: 'expired' });

    const logId = actionLogIdRef.current;
    if (logId) {
      try {
        await completeActionLog(logId, 'user_stopped', progress.emailsDeletedSoFar);
        completeLocalActionLog('user_stopped', 'User cancelled the deletion');
        console.log('[DeleteWithExceptions] Logged cancellation');
      } catch (error) {
        console.error('[DeleteWithExceptions] Failed to log cancellation:', error);
      } finally {
        actionLogIdRef.current = null;
      }
    }
  }, [progress.emailsDeletedSoFar, updateProgress]);

  const startDeleteWithExceptions = useCallback(
    async (
      senders: SenderToDelete[],
      filterRules: RuleGroup[],
      queueProgressCallback?: ProgressCallback,
      abortSignal?: AbortSignal
    ): Promise<{ success: boolean }> => {
      console.log('[DeleteWithExceptions] Starting filtered deletion for senders:', senders);
      console.log('[DeleteWithExceptions] Using filter rules:', filterRules);
      console.log('[DeleteWithExceptions] Queue mode:', !!queueProgressCallback);
      
      // Reset cancellation flags
      isCancelledRef.current = false;
      cancellationRef.current = false;
      
      updateProgress({ status: 'preparing', progressPercent: 0, emailsDeletedSoFar: 0 });

      // --- 0. Basic Checks --- 
      if (!user?.id) {
        toast.error('You must be logged in to delete emails.');
        updateProgress({ status: 'error', error: 'User not logged in.' });
        return { success: false };
      }
      if (!senders || senders.length === 0) {
        toast.warning('No senders selected for deletion.');
        updateProgress({ status: 'idle' });
        return { success: false };
      }
      if (!isClientLoaded) {
        toast.error('Gmail client not ready', { description: 'Please wait a moment and try again.' });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }

      // --- 1. Initial Token & Connection Check ---
      if (!isGmailConnected) {
        console.log('[DeleteWithExceptions] No Gmail connection, showing reauth modal.');
        setReauthModal({ isOpen: true, type: 'expired' });
        updateProgress({ status: 'error', error: 'Gmail not connected.' });
        return { success: false };
      }
      try {
        await getAccessToken(); // Verify refresh token validity
        console.log('[DeleteWithExceptions] Initial access token validated/acquired.');
      } catch (error) {
        console.error('[DeleteWithExceptions] Failed to validate/acquire initial token:', error);
        setReauthModal({ isOpen: true, type: 'expired' });
        updateProgress({ status: 'error', error: 'Gmail authentication failed.' });
        return { success: false };
      }

      // --- 2. Calculate Estimates --- 
      const totalEmailsEstimate = senders.reduce((sum, s) => sum + s.count, 0);
      updateProgress({ totalEmailsToProcess: totalEmailsEstimate });

      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'delete',
        emailCount: totalEmailsEstimate,
        mode: 'single',
      });
      const formattedEta = formatDuration(estimatedRuntimeMs);
      updateProgress({ eta: formattedEta });

      // Initial progress for queue (ensure UI renders properly)
      if (queueProgressCallback) {
        queueProgressCallback(0, totalEmailsEstimate);
      }

      // Add minimum delay for very small operations (UX polish pattern)
      if (totalEmailsEstimate <= 5) {
        await sleep(500);
      }

      // Removed pre-operation token expiry checks
      if (estimatedRuntimeMs > (55 * 60 * 1000)) {
         toast.warning("Long Deletion Detected", {
           description: `Deleting these emails may take ${formattedEta}.`, 
           duration: 8000 
         });
      }

      // --- 3. Logging Initialization ---
      const clientActionId = uuidv4();
      createLocalActionLog({
        clientActionId,
        type: 'delete_with_exceptions',
        estimatedRuntimeMs,
        totalEmails: totalEmailsEstimate,
        totalEstimatedBatches: Math.ceil(totalEmailsEstimate / DELETION_BATCH_SIZE),
        query: `Filtered deletion from ${senders.length} senders`,
      });

      let supabaseLogId: string | undefined;
      try {
        const actionLog = await createActionLog({
          user_id: user.id,
          type: 'delete_with_exceptions',
          status: 'started',
          filters: { 
            senderCount: senders.length, 
            ruleGroupCount: filterRules.length,
            estimatedCount: totalEmailsEstimate 
          },
          estimated_emails: totalEmailsEstimate,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null;
        updateSupabaseLogId(supabaseLogId!); 
      } catch (error) {
        console.error('[DeleteWithExceptions] Failed to create action log:', error);
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentActionLog();
        return { success: false };
      }

      // --- 4. Execution Phase ---
      updateProgress({ status: 'deleting', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'deleting' });

      (async () => {
        let totalSuccessfullyDeleted = 0;
        let errorMessage: string | undefined;
        let endType: ActionEndType = 'success';
        let currentAccessToken: string;

        try {
          // Track deletions per sender for updating counts later
          const senderDeletionCounts = new Map<string, number>();
          
          for (const sender of senders) {
            // Check both cancellation sources (critical pattern from analysis)
            if (isCancelledRef.current || cancellationRef.current || abortSignal?.aborted) {
              endType = 'user_stopped';
              break;
            }

            console.log(`\n[DeleteWithExceptions] Processing sender: ${sender.email}`);
            updateProgress({ currentSender: sender.email });

            const query = buildQuery({ 
              type: 'delete', 
              mode: 'single', 
              senderEmail: sender.email,
              filterRules 
            });
            console.log(`[DeleteWithExceptions] Using query: ${query}`);

            let nextPageToken: string | undefined = undefined;
            let senderDeletedCount = 0;
            let batchFetchAttempts = 0;
            const MAX_FETCH_ATTEMPTS = 30;
            let senderProcessedSuccessfully = true;

            do {
              // Check both cancellation sources (critical pattern from analysis)
              if (isCancelledRef.current || cancellationRef.current || abortSignal?.aborted) {
                endType = 'user_stopped';
                break;
              }

              // --- Token Check & Acquisition before batch ---
              const tokenDetails = peekAccessToken();
              const timeRemaining = tokenTimeRemaining();
              try {
                if (tokenDetails && timeRemaining < TWO_MINUTES_MS) {
                  console.warn(`[DeleteWithExceptions] Token expiring soon, forcing refresh...`);
                  currentAccessToken = await forceRefreshAccessToken();
                } else {
                  currentAccessToken = await getAccessToken(); 
                }
              } catch (tokenError) {
                console.error(`[DeleteWithExceptions] Token acquisition failed:`, tokenError);
                setReauthModal({ isOpen: true, type: 'expired' });
                throw new Error('Gmail authentication failed during deletion.');
              }
              // ---------------------------------------------

              batchFetchAttempts++;
              console.log(`[DeleteWithExceptions] Fetching message IDs batch (Attempt ${batchFetchAttempts})`);

              try {
                const { messageIds, nextPageToken: newPageTokenResult } = await fetchMessageIds(
                  currentAccessToken,
                  query,
                  nextPageToken,
                  DELETION_BATCH_SIZE
                );
                nextPageToken = newPageTokenResult;

                if (messageIds.length === 0) {
                  console.log(`[DeleteWithExceptions] No more message IDs found.`);
                  break;
                }

                console.log(`[DeleteWithExceptions] Found ${messageIds.length} IDs. Attempting batch delete...`);
                await batchDeleteMessages(currentAccessToken, messageIds);

                senderDeletedCount += messageIds.length;
                totalSuccessfullyDeleted += messageIds.length;
                const overallProgress = totalEmailsEstimate > 0
                  ? Math.min(100, Math.round((totalSuccessfullyDeleted / totalEmailsEstimate) * 100))
                  : (nextPageToken ? 50 : 100);

                console.log(`[DeleteWithExceptions] Batch successful. Total deleted: ${totalSuccessfullyDeleted}`);
                updateProgress({
                  emailsDeletedSoFar: totalSuccessfullyDeleted,
                  progressPercent: overallProgress,
                });
                updateActionProgress(batchFetchAttempts, totalSuccessfullyDeleted);

                // Update queue progress callback if provided
                if (queueProgressCallback) {
                  queueProgressCallback(totalSuccessfullyDeleted, totalEmailsEstimate);
                }

                if (BATCH_DELAY_MS > 0 && nextPageToken) {
                  await sleep(BATCH_DELAY_MS);
                }

              } catch (fetchOrDeleteError: any) {
                console.error(`[DeleteWithExceptions] Error during batch:`, fetchOrDeleteError);
                errorMessage = `Failed during batch operation: ${fetchOrDeleteError.message || 'Unknown error'}`;
                endType = 'runtime_error';
                toast.error('Deletion error', { description: errorMessage });
                senderProcessedSuccessfully = false;
                break;
              }

              if (batchFetchAttempts > MAX_FETCH_ATTEMPTS) {
                console.warn(`[DeleteWithExceptions] Reached max fetch attempts`);
                errorMessage = `Reached maximum processing attempts.`;
                endType = 'runtime_error';
                break;
              }

            } while (nextPageToken && endType === 'success' && !isCancelledRef.current && !cancellationRef.current && !(abortSignal?.aborted));

            // Store the count of deleted emails for this sender
            if (senderDeletedCount > 0) {
              senderDeletionCounts.set(sender.email, senderDeletedCount);
              console.log(`[DeleteWithExceptions] Sender ${sender.email}: deleted ${senderDeletedCount} emails`);
            }

            // Mark that delete with exceptions was performed on this sender (for UI indicator)
            if (senderDeletedCount > 0) {
              try {
                await markSenderActionTaken(sender.email, 'delete_with_exceptions');
              } catch (actionError) {
                console.error(`[DeleteWithExceptions] Failed to mark action for sender ${sender.email}:`, actionError);
                // Don't fail the operation if action marking fails
              }
            }

            if (endType !== 'success' && endType !== 'user_stopped') {
              break;
            }
          }

          // --- Update Sender Counts ---
          if (senderDeletionCounts.size > 0 && (endType === 'success' || endType === 'user_stopped')) {
            console.log(`[DeleteWithExceptions] Updating sender counts for ${senderDeletionCounts.size} senders`);
            try {
              // Update each sender's count based on actual deletions
              for (const [senderEmail, deletedCount] of senderDeletionCounts) {
                await updateSenderAfterPartialDeletion(senderEmail, deletedCount);
              }
              console.log(`[DeleteWithExceptions] Successfully updated sender counts`);
            } catch (updateError) {
              console.error(`[DeleteWithExceptions] Failed to update sender counts:`, updateError);
              // Don't fail the operation if sender update fails - it's not critical
            }
          }

          // --- Finalization ---
          console.log(`\n[DeleteWithExceptions] Process finished. End type: ${endType}`);
          console.log(`[DeleteWithExceptions] Total emails deleted: ${totalSuccessfullyDeleted}`);

          await completeActionLog(supabaseLogId!, endType, totalSuccessfullyDeleted, errorMessage);
          completeLocalActionLog(endType, errorMessage);

          updateProgress({
            status: endType === 'success' ? 'completed' : (endType === 'user_stopped' ? 'cancelled' : 'error'),
            progressPercent: endType === 'success' ? 100 : progress.progressPercent,
            emailsDeletedSoFar: totalSuccessfullyDeleted,
            error: errorMessage,
            currentSender: undefined,
          });

          if (endType === 'success') {
            if (totalSuccessfullyDeleted === 0) {
              toast.info('No Emails Deleted', { 
                description: `No emails found that match your criteria. All emails from ${senders.length} sender(s) remain in your inbox.` 
              });
            } else {
              // 🎵 Play success sound for successful deletions
              if (totalSuccessfullyDeleted > 100) {
                playBigSuccessMp3(); // Big success sound for 100+ deletions
              } else {
                playSuccessMp3(); // Regular success sound for smaller deletions
              }
              toast.success('Filtered Deletion Complete', { description: `Successfully deleted ${totalSuccessfullyDeleted.toLocaleString()} matching emails from ${senders.length} sender(s).` });
            }
            // Refresh all stats after successful deletion with exceptions
            await refreshStatsAfterAction('delete_with_exceptions');
          } else if (endType === 'user_stopped') {
            toast.info('Deletion Cancelled', { description: `Deletion stopped after ${totalSuccessfullyDeleted.toLocaleString()} emails.` });
          }

        } catch (processError: any) {
          console.error('[DeleteWithExceptions] Critical error:', processError);
          errorMessage = `An unexpected error occurred: ${processError.message || 'Unknown error'}`;
          endType = 'runtime_error';

          if (supabaseLogId) {
            try {
              await completeActionLog(supabaseLogId, endType, totalSuccessfullyDeleted, errorMessage);
              completeLocalActionLog(endType, errorMessage);
            } catch (logError) {
              console.error("[DeleteWithExceptions] Failed to log critical error:", logError);
            }
          }

          updateProgress({ status: 'error', error: errorMessage, currentSender: undefined });
          toast.error('Deletion Failed', { description: errorMessage });
        } finally {
          actionLogIdRef.current = null;
        }
      })();

      return { success: true }; // Indicates process started
    },
    // --- Dependencies --- 
    [
      user?.id,
      isClientLoaded,
      isGmailConnected,
      getAccessToken,
      forceRefreshAccessToken,
      peekAccessToken,
      tokenTimeRemaining,
      updateProgress,
    ]
  );

  // --- Queue Integration (Wrap Pattern) ---
  const queueExecutor = useCallback(async (
    payload: DeleteWithExceptionsJobPayload,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ): Promise<ExecutorResult> => {
    console.log('[DeleteWithExceptions] Queue executor called with payload:', payload);
    
    // Convert queue payload to hook format  
    const senders: SenderToDelete[] = payload.senders;
    const filterRules: RuleGroup[] = payload.filterRules;
    
    // Set up cancellation handling
    const handleAbort = () => {
      console.log('[DeleteWithExceptions] Queue abort signal received');
      cancelDelete();
    };
    abortSignal.addEventListener('abort', handleAbort);
    
    try {
      // Call existing function with progress callback
      const result = await startDeleteWithExceptions(senders, filterRules, onProgress, abortSignal);
      
      // Wait for completion and determine final result
      return new Promise((resolve) => {
        const checkCompletion = () => {
          const currentProgress = progressRef.current;
          
          if (currentProgress.status === 'completed') {
            resolve({
              success: true,
              processedCount: currentProgress.emailsDeletedSoFar
            });
          } else if (currentProgress.status === 'cancelled') {
            resolve({
              success: false,
              error: 'Operation cancelled by user',
              processedCount: currentProgress.emailsDeletedSoFar
            });
          } else if (currentProgress.status === 'error') {
            resolve({
              success: false,
              error: currentProgress.error || 'Unknown error occurred',
              processedCount: currentProgress.emailsDeletedSoFar
            });
          } else {
            // Still processing, check again in 1 second
            setTimeout(checkCompletion, 1000);
          }
        };
        
        // Start checking immediately
        checkCompletion();
      });
      
    } finally {
      abortSignal.removeEventListener('abort', handleAbort);
    }
  }, [startDeleteWithExceptions, cancelDelete]);

  // Register executor with queue system
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__queueRegisterExecutor) {
      console.log('[DeleteWithExceptions] Registering queue executor');
      (window as any).__queueRegisterExecutor('deleteWithExceptions', queueExecutor);
    }
  }, [queueExecutor]);

  return {
    progress,
    startDeleteWithExceptions,
    cancelDelete,
    reauthModal,
    closeReauthModal,
  };
} 