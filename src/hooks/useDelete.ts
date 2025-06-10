/**
 * useDelete.ts
 *
 * Hook for handling email deletion functionality.
 * 
 * This hook provides functions to:
 * 1. Start a deletion process for emails from one or more senders.
 * 2. Cancel an ongoing deletion process.
 * 3. Manage the state of the deletion (progress, status, errors).
 * 4. Handle Google authentication checks and prompt for re-authentication if needed.
 * 5. Log deletion actions to local storage and Supabase.
 * 6. Support queue integration for centralized task management.
 * 7. Update sender counts to 0 after successful deletion (similar to GitHub issue #41 for Mark as Read).
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthProvider';

// --- Contexts & Hooks ---
import { 
  useGmailPermissions, 
  // TypesTokenStatus // Avoid importing unused types if TokenStatus isn't used directly
} from '@/context/GmailPermissionsProvider'; // Gmail token/permission handling

// --- API/Helper Functions ---
import { estimateRuntimeMs, formatDuration, OperationType, OperationMode } from '@/lib/utils/estimateRuntime';
import { buildQuery, RuleGroup } from '@/lib/gmail/buildQuery';
import { fetchMessageIds } from '@/lib/gmail/fetchMessageIds';
import { batchDeleteMessages } from '@/lib/gmail/batchDeleteMessages'; // Our new helper
import { markSenderActionTaken, updateSenderAfterDeletion } from '@/lib/storage/senderAnalysis'; // Import the new function
import { refreshStatsAfterAction } from '@/lib/utils/updateStats';
import { playDeleteSound, playSuccessSound, playSuccessMp3, playBigSuccessMp3 } from '@/lib/utils/sounds';

// --- Storage & Logging ---
import { createActionLog, updateActionLog, completeActionLog } from '@/supabase/actions/logAction';
import {
  createActionLog as createLocalActionLog,
  updateSupabaseLogId,
  updateActionProgress,
  completeActionLog as completeLocalActionLog,
  clearCurrentActionLog,
} from '@/lib/storage/actionLog'; // New imports for action logging
import { logger } from '@/lib/utils/logger';

// --- Components ---
import { ReauthDialog } from '@/components/modals/ReauthDialog'; // For prompting re-login

// --- Types ---
import { ActionEndType } from '@/types/actions';
import { DeleteJobPayload, ProgressCallback, ExecutorResult } from '@/types/queue';



// --- Constants ---
const TWO_MINUTES_MS = 2 * 60 * 1000; // Threshold for token expiry check before batches
const DELETION_BATCH_SIZE = 1000; // Max IDs for batchDelete
const BATCH_DELAY_MS = 150; // Small delay between batches (optional)

// --- State & Progress Types ---

/** Possible states during the deletion process */
export type DeletingStatus =
  | 'idle' // Not doing anything
  | 'preparing' // Checking permissions, estimating time
  | 'deleting' // Actively calling Gmail API
  | 'completed' // Finished successfully
  | 'error' // Failed with an error
  | 'cancelled'; // User stopped it

/** Detailed progress information for the UI */
export interface DeletingProgress {
  status: DeletingStatus;
  progressPercent: number; // Overall progress (0-100)
  totalEmailsToProcess: number; // Initial estimate
  emailsDeletedSoFar: number; // Running count
  currentSender?: string; // Which sender is being processed now
  error?: string; // Error message if status is 'error'
  eta?: string; // Estimated time remaining (optional)
}

/** Input format: specify sender email and estimated count */
export interface SenderToDelete {
  email: string;
  count: number; // Estimated number of emails from this sender
}

/** Optional filter rules for deletion */
export interface DeleteOptions {
  filterRules?: RuleGroup[]; // Add filter rules as an optional parameter
}

/** State for the re-authentication modal */
interface ReauthModalState {
  isOpen: boolean;
  type: 'expired' | 'will_expire_during_operation'; // will_expire might not be needed now
  eta?: string; // Estimated time for the operation
}

// --- Helper Functions ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- The Hook ---

export function useDelete() {
  const { user } = useAuth(); // Get Supabase user session
  const {
    getAccessToken,
    forceRefreshAccessToken,
    peekAccessToken,
    tokenTimeRemaining,
    hasRefreshToken: isGmailConnected, // Alias for clarity
    isClientLoaded
  } = useGmailPermissions(); // Use the new functions from context

  const [progress, setProgress] = useState<DeletingProgress>({
    status: 'idle',
    progressPercent: 0,
    totalEmailsToProcess: 0,
    emailsDeletedSoFar: 0,
  });

  const [reauthModal, setReauthModal] = useState<ReauthModalState>({
    isOpen: false,
    type: 'expired', // Default to expired
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
    logger.debug('Closing reauth modal', { component: 'useDelete' });
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const cancelDelete = useCallback(async () => {
    logger.debug('Cancellation requested', { component: 'useDelete' });
    isCancelledRef.current = true; // Signal the running process to stop
    cancellationRef.current = true; // Also set the queue-compatible ref
    updateProgress({ status: 'cancelled' }); // Pass partial update object
    setReauthModal({ isOpen: false, type: 'expired' }); // Close modal if open

    const logId = actionLogIdRef.current;
    if (logId) {
      try {
        await completeActionLog(logId, 'user_stopped', progress.emailsDeletedSoFar);
        completeLocalActionLog('user_stopped');
        logger.debug('Logged cancellation to Supabase and local storage', { component: 'useDelete' });
      } catch (error) {
        logger.error('Failed to log cancellation', { component: 'useDelete', error });
      } finally {
        actionLogIdRef.current = null; // Clear the ref
      }
    }
  }, [progress.emailsDeletedSoFar, updateProgress]);

  const startDelete = useCallback(
    async (
      senders: SenderToDelete[], 
      queueProgressCallback?: ProgressCallback,
      abortSignal?: AbortSignal,
      options?: DeleteOptions
    ): Promise<{ success: boolean }> => {
      logger.debug('Starting deletion process for senders', { 
        component: 'useDelete', 
        senderCount: senders.length 
      });
      logger.debug('With filter rules', { 
        component: 'useDelete', 
        filterRules: options?.filterRules 
      });
      logger.debug('Queue mode', { 
        component: 'useDelete', 
        queueMode: !!queueProgressCallback 
      });
      
      // Reset cancellation flags
      isCancelledRef.current = false;
      cancellationRef.current = false;
      
      updateProgress({ status: 'preparing', progressPercent: 0, emailsDeletedSoFar: 0 });
      logger.debug('Preparing deletion...', { component: 'useDelete' });

      // --- 0. Basic Checks --- (User, Senders, GAPI Client)
      if (!user?.id) {
        toast.error('You must be logged in to delete emails.');
        logger.error('User not logged in', { component: 'useDelete' });
        updateProgress({ status: 'error', error: 'User not logged in.' });
        return { success: false };
      }
      if (!senders || senders.length === 0) {
        toast.warning('No senders selected for deletion.');
        logger.warn('No senders provided', { component: 'useDelete' });
        updateProgress({ status: 'idle' }); // Go back to idle
        return { success: false };
      }
      if (!isClientLoaded) {
        logger.error('Gmail API client is not loaded yet', { component: 'useDelete' });
        toast.error('Gmail client not ready', { description: 'Please wait a moment and try again.' });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }

      // --- 1. Initial Token & Connection Check ---
      if (!isGmailConnected) {
        logger.debug('No Gmail connection, showing reauth modal', { component: 'useDelete' });
        setReauthModal({ isOpen: true, type: 'expired' });
        updateProgress({ status: 'error', error: 'Gmail not connected.' });
        return { success: false };
      }
      try {
        await getAccessToken(); // Verify refresh token validity and get initial access token
        logger.debug('Initial access token validated/acquired', { component: 'useDelete' });
      } catch (error) {
        logger.error('Failed to validate/acquire initial token', { component: 'useDelete', error });
        setReauthModal({ isOpen: true, type: 'expired' });
        updateProgress({ status: 'error', error: 'Gmail authentication failed.' });
        return { success: false };
      }

      // --- 2. Calculate Estimates --- 
      const totalEmailsEstimate = senders.reduce((sum, s) => sum + s.count, 0);
      updateProgress({ totalEmailsToProcess: totalEmailsEstimate });
      logger.debug('Total estimated emails', { 
        component: 'useDelete', 
        totalEmails: totalEmailsEstimate 
      });

      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'delete',
        emailCount: totalEmailsEstimate,
        mode: 'single',
      });
      const formattedEta = formatDuration(estimatedRuntimeMs);
      updateProgress({ eta: formattedEta });
      logger.debug('Estimated runtime', { 
        component: 'useDelete', 
        eta: formattedEta 
      });

      // Initial progress for queue (ensure UI renders properly)
      if (queueProgressCallback) {
        queueProgressCallback(0, totalEmailsEstimate);
      }

      // Add minimum delay for very small operations (UX polish pattern)
      if (totalEmailsEstimate <= 5) {
        await sleep(500);
      }

      // Removed pre-operation token expiry check.
      // Add toast for very long operations (>55 mins)
      if (estimatedRuntimeMs > (55 * 60 * 1000)) {
        toast.warning("Long Deletion Detected", {
          description: `Deleting these emails may take ${formattedEta}. You can navigate away, but ensure this tab stays open. If your session expires, you might need to reconnect.`, 
          duration: 8000 
        });
      }

      // --- 3. Logging Initialization ---
      const clientActionId = uuidv4();
      createLocalActionLog({
        clientActionId,
        type: 'delete',
        estimatedRuntimeMs,
        totalEmails: totalEmailsEstimate,
        totalEstimatedBatches: Math.ceil(totalEmailsEstimate / DELETION_BATCH_SIZE),
        query: `Deleting from ${senders.length} senders`,
      });
      logger.debug('Created local action log', { 
        component: 'useDelete', 
        clientActionId 
      });

      let supabaseLogId: string | undefined;
      try {
        const actionLog = await createActionLog({
          user_id: user.id,
          type: 'delete',
          status: 'started',
          filters: { senderCount: senders.length, estimatedCount: totalEmailsEstimate },
          estimated_emails: totalEmailsEstimate,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null;
        updateSupabaseLogId(supabaseLogId!); // Update local log with Supabase ID
        logger.debug('Created Supabase action log', { 
          component: 'useDelete', 
          supabaseLogId 
        });
      } catch (error) {
        logger.error('Failed to create Supabase action log', { component: 'useDelete', error });
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentActionLog(); // Clean up local log
        return { success: false };
      }

      // --- 4. Execution Phase --- 
      updateProgress({ status: 'deleting', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'deleting' });
      logger.debug('Starting active deletion...', { component: 'useDelete' });

      (async () => {
        let totalSuccessfullyDeleted = 0;
        let errorMessage: string | undefined;
        let endType: ActionEndType = 'success'; // Assume success initially
        let currentAccessToken: string;

        try {
          for (const sender of senders) {
            // Check both cancellation sources (critical pattern from analysis)
            if (isCancelledRef.current || cancellationRef.current || abortSignal?.aborted) {
              logger.debug('Cancellation detected before processing sender', { 
                component: 'useDelete', 
                senderEmail: sender.email 
              });
              endType = 'user_stopped';
              break; // Exit the sender loop
            }

            logger.debug('Processing sender', { 
              component: 'useDelete', 
              senderEmail: sender.email, 
              estimatedCount: sender.count 
            });
            updateProgress({ currentSender: sender.email });

            const query = buildQuery({ 
              type: 'delete', 
              mode: 'single', 
              senderEmail: sender.email,
              filterRules: options?.filterRules
            });
            logger.debug('Using query', { component: 'useDelete', query });

            let nextPageToken: string | undefined = undefined;
            let senderDeletedCount = 0;
            let batchFetchAttempts = 0;
            const MAX_FETCH_ATTEMPTS = 30; 
            let senderProcessedSuccessfully = true;

            do {
              // Check both cancellation sources (critical pattern from analysis)
              if (isCancelledRef.current || cancellationRef.current || abortSignal?.aborted) {
                logger.debug('Cancellation detected during batch processing', { 
                  component: 'useDelete', 
                  senderEmail: sender.email 
                });
                endType = 'user_stopped';
                break;
              }

              // --- Token Check & Acquisition before batch ---
              const tokenDetails = peekAccessToken();
              const timeRemaining = tokenTimeRemaining();
              try {
                if (tokenDetails && timeRemaining < TWO_MINUTES_MS) {
                  logger.warn('Token expiring soon, forcing refresh', { 
                    component: 'useDelete', 
                    timeRemaining: formatDuration(timeRemaining) 
                  });
                  currentAccessToken = await forceRefreshAccessToken();
                } else {
                  currentAccessToken = await getAccessToken(); // Gets from memory or refreshes if expired
                }
              } catch (tokenError) {
                logger.error('Token acquisition failed for batch', { 
                  component: 'useDelete', 
                  error: tokenError 
                });
                setReauthModal({ isOpen: true, type: 'expired' });
                throw new Error('Gmail authentication failed during deletion.');
              }
              // ---------------------------------------------

              batchFetchAttempts++;
              logger.debug('Fetching message IDs batch', { 
                component: 'useDelete', 
                attempt: batchFetchAttempts, 
                senderEmail: sender.email 
              });

              try {
                const { messageIds, nextPageToken: newPageTokenResult } = await fetchMessageIds(
                    currentAccessToken,
                    query,
                    nextPageToken,
                    DELETION_BATCH_SIZE
                );
                nextPageToken = newPageTokenResult;

                if (messageIds.length === 0) {
                  logger.debug('No more message IDs found for sender', { 
                    component: 'useDelete', 
                    senderEmail: sender.email 
                  });
                  break;
                }

                logger.debug('Found IDs, attempting batch delete', { 
                  component: 'useDelete', 
                  messageCount: messageIds.length 
                });
                await batchDeleteMessages(currentAccessToken, messageIds);

                senderDeletedCount += messageIds.length;
                totalSuccessfullyDeleted += messageIds.length;
                const overallProgress = totalEmailsEstimate > 0
                  ? Math.min(100, Math.round((totalSuccessfullyDeleted / totalEmailsEstimate) * 100))
                  : (nextPageToken ? 50 : 100); 

                logger.debug('Batch successful for sender', { 
                  component: 'useDelete', 
                  senderEmail: sender.email, 
                  totalDeleted: totalSuccessfullyDeleted 
                });
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
                  logger.error('Error during fetch/delete batch for sender', { 
                    component: 'useDelete', 
                    senderEmail: sender.email, 
                    error: fetchOrDeleteError 
                  });
                  errorMessage = `Failed during batch operation for ${sender.email}: ${fetchOrDeleteError.message || 'Unknown error'}`;
                  endType = 'runtime_error';
                  toast.error('Deletion error', { description: errorMessage });
                  senderProcessedSuccessfully = false;
                  break; 
              }

              if (batchFetchAttempts > MAX_FETCH_ATTEMPTS) {
                  logger.warn('Reached max fetch attempts', { 
                    component: 'useDelete', 
                    maxAttempts: MAX_FETCH_ATTEMPTS 
                  });
                   errorMessage = `Reached maximum processing attempts for ${sender.email}.`;
                   endType = 'runtime_error';
                  break;
              }

            } while (nextPageToken && endType === 'success' && !isCancelledRef.current && !cancellationRef.current && !(abortSignal?.aborted));

            if (senderProcessedSuccessfully && !isCancelledRef.current && !cancellationRef.current && !(abortSignal?.aborted)) {
              try {
                await markSenderActionTaken(sender.email, 'delete');
                await updateSenderAfterDeletion(sender.email);
                logger.debug('Updated sender counts to 0 after deletion', { 
                  component: 'useDelete', 
                  senderEmail: sender.email 
                });
              } catch (markError) {
                logger.error('Failed to mark action taken or update counts for sender', { 
                  component: 'useDelete', 
                  senderEmail: sender.email, 
                  error: markError 
                });
                // Don't fail the entire operation for this, just log it
              }
            }

            if (endType !== 'success' && endType !== 'user_stopped') {
                break; // Stop processing further senders if an error occurred
            }
          } // End of sender loop

          // --- 5. Finalization ---
          logger.debug('Deletion process finished', { 
            component: 'useDelete', 
            endType 
          });
          logger.debug('Total emails successfully deleted', { 
            component: 'useDelete', 
            totalDeleted: totalSuccessfullyDeleted 
          });

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
            // 🎵 Play satisfying delete sound effect
            if (totalSuccessfullyDeleted > 0) {
              if (totalSuccessfullyDeleted > 100) {
                playBigSuccessMp3(); // Big success sound for 100+ deletions
              } else {
                playSuccessMp3(); // Regular success sound for smaller deletions
              }
            }
            
            toast.success('Deletion Complete', { description: `Successfully deleted ${totalSuccessfullyDeleted.toLocaleString()} emails from ${senders.length} sender(s).` });
            
            // Refresh all stats after successful deletion
            await refreshStatsAfterAction('delete');
          } else if (endType === 'user_stopped') {
            toast.info('Deletion Cancelled', { description: `Deletion stopped after ${totalSuccessfullyDeleted.toLocaleString()} emails.` });
          } // Errors already toasted

        } catch (processError: any) {
            logger.error('Critical error during deletion process', { 
              component: 'useDelete', 
              error: processError 
            });
            errorMessage = `An unexpected error occurred: ${processError.message || 'Unknown error'}`;
            endType = 'runtime_error';

            if (supabaseLogId) {
                try {
                    await completeActionLog(supabaseLogId, endType, totalSuccessfullyDeleted, errorMessage);
                    completeLocalActionLog(endType, errorMessage);
                } catch (logError) {
                    logger.error('Failed to log critical error', { 
                      component: 'useDelete', 
                      error: logError 
                    });
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
      // Removed requestPermissions as errors now trigger modal directly
    ]
  );

  // --- Queue Integration (Wrap Pattern) ---
  const queueExecutor = useCallback(async (
    payload: DeleteJobPayload,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ): Promise<ExecutorResult> => {
    logger.debug('Queue executor called with payload', { 
      component: 'useDelete', 
      payload 
    });
    
    // Convert queue payload to hook format  
    const senders: SenderToDelete[] = payload.senders;
    
    // Set up cancellation handling
    const handleAbort = () => {
      logger.debug('Queue abort signal received', { 
        component: 'useDelete' 
      });
      cancelDelete();
    };
    abortSignal.addEventListener('abort', handleAbort);
    
    try {
      // Call existing function with progress callback
      const result = await startDelete(senders, onProgress, abortSignal);
      
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
  }, [startDelete, cancelDelete]);

  // Register executor with queue system
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__queueRegisterExecutor) {
      logger.debug('Registering queue executor', { 
        component: 'useDelete' 
      });
      (window as any).__queueRegisterExecutor('delete', queueExecutor);
    }
  }, [queueExecutor]);

  return {
    progress,
    startDelete,
    cancelDelete,
    reauthModal,
    closeReauthModal,
  };
} 