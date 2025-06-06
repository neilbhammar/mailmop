/**
 * useMarkAsRead.ts
 *
 * Hook for marking emails as read, either for a single sender or in bulk.
 * Simpler version of useDeleteWithExceptions that:
 * 1. Only targets unread messages
 * 2. Uses batchModify instead of delete
 * 3. Doesn't need IndexedDB tracking
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// --- Contexts & Hooks ---
import { useAuth } from '@/context/AuthProvider';
import {
  useGmailPermissions,
  // TypesTokenStatus // Avoid importing unused types if TokenStatus isn't used directly
} from '@/context/GmailPermissionsProvider';

// --- API/Helper Functions ---
import { estimateRuntimeMs, formatDuration } from '@/lib/utils/estimateRuntime';
import { buildQuery } from '@/lib/gmail/buildQuery';
import { fetchMessageIds } from '@/lib/gmail/fetchMessageIds';

// --- Storage & Logging ---
import { createActionLog, updateActionLog, completeActionLog } from '@/supabase/actions/logAction';
import {
  createActionLog as createLocalActionLog,
  updateSupabaseLogId,
  updateActionProgress,
  completeActionLog as completeLocalActionLog,
  clearCurrentActionLog,
} from '@/lib/storage/actionLog';

// --- Types ---
import { ActionEndType } from '@/types/actions';
import { MarkReadJobPayload, ProgressCallback, ExecutorResult } from '@/types/queue';

// --- Dev Tooling ---
import { logger } from '@/lib/utils/logger';

// --- Constants ---
const TWO_MINUTES_MS = 2 * 60 * 1000;
const FETCH_BATCH_SIZE = 100;  // Gmail API recommendation for list operations
const MODIFY_BATCH_SIZE = 1000; // Gmail API max for batchModify
const BATCH_DELAY_MS = 150;

/** Possible states during the mark as read process */
export type MarkingStatus =
  | 'idle'
  | 'preparing'
  | 'marking'
  | 'completed'
  | 'error'
  | 'cancelled';

/** Progress information for the UI */
export interface MarkingProgress {
  status: MarkingStatus;
  progressPercent: number;
  totalToProcess: number;
  markedSoFar: number;
  currentSender?: string;
  error?: string;
  eta?: string;
}

/** Input format for marking emails from a sender */
export interface SenderToMark {
  email: string;
  unreadCount: number;
}

/** State for the re-authentication modal */
interface ReauthModalState {
  isOpen: boolean;
  type: 'expired'; // Simplified type
  eta?: string;
}

// --- Helper Functions ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Marks a batch of messages as read using the Gmail API
 */
async function batchMarkAsRead(accessToken: string, messageIds: string[]) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: messageIds,
      removeLabelIds: ['UNREAD']
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to mark messages as read: ${response.statusText}`);
  }
}

export function useMarkAsRead() {
  const { user, plan: authPlan } = useAuth();
  const {
    getAccessToken,
    forceRefreshAccessToken,
    peekAccessToken,
    tokenTimeRemaining,
    hasRefreshToken: isGmailConnected, // Alias for clarity
    isClientLoaded
    // requestPermissions, // No longer directly called from here for reauth trigger
  } = useGmailPermissions();

  // State for progress visible to the UI
  const [progress, setProgress] = useState<MarkingProgress>({
    status: 'idle',
    progressPercent: 0,
    totalToProcess: 0,
    markedSoFar: 0,
  });

  // State for managing the re-authentication dialog
  const [reauthModal, setReauthModal] = useState<ReauthModalState>({
    isOpen: false,
    type: 'expired',
  });

  // Use a ref to keep track of the Supabase action log ID
  const actionLogIdRef = useRef<string | null>(null);
  // Ref to signal cancellation
  const isCancelledRef = useRef<boolean>(false);

  /**
   * Updates the progress state
   */
  const updateProgress = useCallback(
    (newProgress: Partial<MarkingProgress>) => {
      setProgress((prev) => ({ ...prev, ...newProgress }));
    },
    []
  );

  /** Closes the re-authentication modal */
  const closeReauthModal = useCallback(() => {
    logger.debug('[MarkAsRead] Closing reauth modal');
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Cancels an ongoing mark as read process
   */
  const cancelMarkAsRead = useCallback(async () => {
    logger.debug('[MarkAsRead] Cancellation requested');
    isCancelledRef.current = true;
    updateProgress({ status: 'cancelled', progressPercent: 0 });
    setReauthModal({ isOpen: false, type: 'expired' }); // Ensure type is 'expired'

    // Log cancellation to Supabase if an action was started
    const logId = actionLogIdRef.current;
    if (logId) {
      try {
        await completeActionLog(
          logId,
          'user_stopped',
          progress.markedSoFar
        );
        completeLocalActionLog('user_stopped');
        logger.debug('[MarkAsRead] Logged cancellation');
      } catch (error) {
        logger.error('[MarkAsRead] Failed to log cancellation:', error);
      } finally {
        actionLogIdRef.current = null;
      }
    }
  }, [progress.markedSoFar, updateProgress]);

  /**
   * 📧 MAIN MARK AS READ FUNCTION
   *
   * This handles the complete Mark as Read workflow:
   * - Premium feature checks
   * - Authentication & token management
   * - Progress tracking and UI updates
   * - Error handling with user-friendly messages
   * - Success/failure notifications
   * - Logging to Supabase
   *
   * Can be called directly by UI components OR by the queue system
   */
  const startMarkAsRead = useCallback(
    async (senders: SenderToMark[], queueProgressCallback?: ProgressCallback): Promise<{ success: boolean }> => {
      logger.debug('[MarkAsRead] Starting mark as read for senders:', senders);
      logger.debug('[MarkAsRead] Current plan status from useAuth():', authPlan);

      // --- Premium Feature Check ---
      if (authPlan !== 'pro') {
        console.warn('[MarkAsRead] Non-pro user attempting to mark as read. Plan:', authPlan);
        toast.error('Upgrade to Pro', { description: 'Mark as Read is a premium feature.' });
        return { success: false };
      }

      isCancelledRef.current = false;

      // --- Basic Checks ---
      if (!user?.id) {
        toast.error('You must be logged in to modify emails.');
        return { success: false };
      }
      if (!senders || senders.length === 0) {
        toast.warning('No senders selected.');
        return { success: false };
      }

      // --- Preparation Phase ---
      updateProgress({ status: 'preparing', progressPercent: 0, markedSoFar: 0 });

      if (!isClientLoaded) {
        logger.error('[MarkAsRead] Gmail API client is not loaded yet.');
        toast.error('Gmail client not ready', {
          description: 'Please wait a moment and try again.'
        });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }

      const totalToProcess = senders.reduce((sum, s) => sum + s.unreadCount, 0);
      updateProgress({ totalToProcess });

      // Initialize progress tracking
      updateProgress({
        status: 'marking',
        progressPercent: 0,
        totalToProcess: totalToProcess,
        markedSoFar: 0,
        currentSender: undefined,
        error: undefined,
      });

      // Initial queue progress callback if provided
      if (queueProgressCallback) {
        queueProgressCallback(0, totalToProcess);
      }

      // For very small operations, add a small delay to ensure UI can render
      if (totalToProcess <= 5) {
        await sleep(500); // 500ms delay for very small operations
      }

      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'mark',
        emailCount: totalToProcess,
        mode: 'single',
      });
      const formattedEta = formatDuration(estimatedRuntimeMs);
      updateProgress({ eta: formattedEta });

      // --- Token & Permission Checks (New Strategy) ---
      if (!isGmailConnected) {
        logger.debug('[MarkAsRead] No Gmail connection (no refresh token), showing reauth modal.');
        setReauthModal({ isOpen: true, type: 'expired', eta: formattedEta });
        updateProgress({ status: 'error', error: 'Gmail not connected. Please reconnect.' });
        return { success: false };
      }

      try {
        await getAccessToken(); // Verify refresh token validity and get initial access token
        logger.debug('[MarkAsRead] Initial access token validated/acquired.');
      } catch (error) {
        logger.error('[MarkAsRead] Failed to validate/acquire initial token:', error);
        setReauthModal({ isOpen: true, type: 'expired', eta: formattedEta });
        updateProgress({ status: 'error', error: 'Gmail authentication failed. Please reconnect.' });
        return { success: false };
      }
      // Removed pre-operation token expiry check based on estimatedRuntimeMs

      // --- Logging Initialization ---
      const clientActionId = uuidv4();
      createLocalActionLog({
        clientActionId,
        type: 'mark_as_read',
        estimatedRuntimeMs,
        totalEmails: totalToProcess,
        totalEstimatedBatches: Math.ceil(totalToProcess / MODIFY_BATCH_SIZE),
        query: `Marking as read from ${senders.length} senders`,
      });

      let supabaseLogId: string | undefined;
      try {
        const actionLog = await createActionLog({
          user_id: user.id,
          type: 'mark_as_read',
          status: 'started',
          filters: {
            senderCount: senders.length,
            estimatedCount: totalToProcess
          },
          estimated_emails: totalToProcess,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null;
        updateSupabaseLogId(supabaseLogId!);
      } catch (error) {
        logger.error('[MarkAsRead] Failed to create action log:', error);
        toast.error('Failed to start marking as read.');
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentActionLog();
        return { success: false };
      }

      // --- Execution Phase ---
      updateProgress({ status: 'marking', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'marking' });

      // Show initial toast
      toast.info('Marking emails as read...', {
        description: `Processing ${totalToProcess.toLocaleString()} emails from ${senders.length} sender(s)`
      });

      // Run the actual marking process (NOT in background - wait for completion)
      let totalMarkedAsRead = 0;
      let errorMessage: string | undefined;
      let endType: ActionEndType = 'success';
      let currentAccessToken: string; // To store the token for the current batch

      try {
        for (const sender of senders) {
          if (isCancelledRef.current) {
            logger.debug(`[MarkAsRead] Cancellation detected before processing ${sender.email}`);
            endType = 'user_stopped';
            break;
          }

          logger.debug(`\n[MarkAsRead] Processing sender: ${sender.email}`);
          updateProgress({ currentSender: sender.email });

          // Build query to get only unread messages from this sender
          const query = buildQuery({
            type: 'mark',
            mode: 'read',
            senderEmail: sender.email,
            additionalTerms: ['is:unread']
          });
          logger.debug(`[MarkAsRead] Using query: ${query}`);

          let nextPageToken: string | undefined = undefined;
          let batchFetchAttempts = 0;
          const MAX_FETCH_ATTEMPTS = 30;

          do {
            if (isCancelledRef.current) {
              logger.debug(`[MarkAsRead] Cancellation detected during batch processing`);
              endType = 'user_stopped';
              break;
            }

            // --- Token Check & Acquisition before batch (New Strategy) ---
            const tokenDetails = peekAccessToken();
            const timeRemaining = tokenTimeRemaining();
            try {
              if (tokenDetails && timeRemaining < TWO_MINUTES_MS) {
                console.warn(`[MarkAsRead] Token expiring soon (in ${formatDuration(timeRemaining)}), forcing refresh...`);
                currentAccessToken = await forceRefreshAccessToken();
              } else {
                currentAccessToken = await getAccessToken(); // Gets from memory or refreshes if expired
              }
              logger.debug(`[MarkAsRead] Token acquired for batch processing sender: ${sender.email}`);
            } catch (tokenError: any) {
              logger.error(`[MarkAsRead] Token acquisition failed for batch processing ${sender.email}:`, tokenError);
              // Determine remaining ETA for the modal if needed
              const remainingEmailsForEta = totalToProcess - totalMarkedAsRead;
              const remainingTimeMsForEta = estimateRuntimeMs({
                operationType: 'mark',
                emailCount: remainingEmailsForEta,
                mode: 'single'
              });
              setReauthModal({
                isOpen: true,
                type: 'expired', // Simplified type
                eta: formatDuration(remainingTimeMsForEta)
              });
              // This error will be caught by the main try-catch block
              throw new Error("Gmail authentication failed during operation. Please re-authenticate.");
            }
            // ---------------------------------------------

            batchFetchAttempts++;
            logger.debug(`[MarkAsRead] Fetching message IDs batch (Attempt ${batchFetchAttempts})`);

            try {
              // Use currentAccessToken obtained above
              const { messageIds, nextPageToken: newPageToken } = await fetchMessageIds(
                currentAccessToken,
                query,
                nextPageToken,
                FETCH_BATCH_SIZE
              );

              nextPageToken = newPageToken;

              if (messageIds.length === 0) {
                logger.debug(`[MarkAsRead] No more unread messages found.`);
                break;
              }

              logger.debug(`[MarkAsRead] Found ${messageIds.length} unread messages. Marking as read...`);

              // Process in chunks of MODIFY_BATCH_SIZE
              for (let i = 0; i < messageIds.length; i += MODIFY_BATCH_SIZE) {
                const batch = messageIds.slice(i, i + MODIFY_BATCH_SIZE);
                // Use currentAccessToken obtained above
                await batchMarkAsRead(currentAccessToken, batch);

                totalMarkedAsRead += batch.length;
                const overallProgress = totalToProcess > 0
                  ? Math.min(100, Math.round((totalMarkedAsRead / totalToProcess) * 100))
                  : (nextPageToken ? 50 : 100);

                logger.debug(`[MarkAsRead] Batch successful. Total marked: ${totalMarkedAsRead}`);
                updateProgress({
                  markedSoFar: totalMarkedAsRead,
                  progressPercent: overallProgress,
                });

                // Update queue progress callback if provided
                if (queueProgressCallback) {
                  queueProgressCallback(totalMarkedAsRead, totalToProcess);
                }
              }

              if (BATCH_DELAY_MS > 0 && nextPageToken) {
                await sleep(BATCH_DELAY_MS);
              }

            } catch (error: any) {
              logger.error(`[MarkAsRead] Error during batch:`, error);
              errorMessage = `Failed during batch operation: ${error.message || 'Unknown error'}`;
              endType = 'runtime_error';
              toast.error('Error marking as read', { description: errorMessage });
              break;
            }

            if (batchFetchAttempts > MAX_FETCH_ATTEMPTS) {
              console.warn(`[MarkAsRead] Reached max fetch attempts`);
              errorMessage = `Reached maximum processing attempts.`;
              endType = 'runtime_error';
              break;
            }

          } while (nextPageToken && endType === 'success');

          if (endType !== 'success') break;
        }

        // --- Finalization ---
        logger.debug(`\n[MarkAsRead] Process finished. End type: ${endType}`);
        logger.debug(`[MarkAsRead] Total emails marked as read: ${totalMarkedAsRead}`);

        // Update Supabase log
        await completeActionLog(
          supabaseLogId!,
          endType,
          totalMarkedAsRead,
          errorMessage
        );

        // Update local storage log
        completeLocalActionLog(endType, errorMessage);

        updateProgress({
          status: endType === 'success' ? 'completed' : (endType === 'user_stopped' ? 'cancelled' : 'error'),
          progressPercent: endType === 'success' ? 100 : progress.progressPercent,
          markedSoFar: totalMarkedAsRead,
          error: errorMessage,
          currentSender: undefined,
        });

        if (endType === 'success') {
          toast.success('Mark as Read Complete', {
            description: `Successfully marked ${totalMarkedAsRead.toLocaleString()} emails as read from ${senders.length} sender(s).`
          });
        } else if (endType === 'user_stopped') {
          toast.info('Operation Cancelled', {
            description: `Stopped after marking ${totalMarkedAsRead.toLocaleString()} emails as read.`
          });
        }

        return { success: endType === 'success' };

      } catch (error: any) {
        logger.error('[MarkAsRead] Critical error:', error);
        errorMessage = `An unexpected error occurred: ${error.message || 'Unknown error'}`;
        endType = 'runtime_error';

        if (supabaseLogId) {
          try {
            await completeActionLog(supabaseLogId, endType, totalMarkedAsRead, errorMessage);
            completeLocalActionLog(endType, errorMessage);
          } catch (logError) {
            logger.error("[MarkAsRead] Failed to log critical error:", logError);
          }
        }

        updateProgress({
          status: 'error',
          error: errorMessage,
          currentSender: undefined,
        });
        toast.error('Operation Failed', { description: errorMessage });

        return { success: false };
      } finally {
        actionLogIdRef.current = null;
      }
    },
    [
      user?.id,
      updateProgress,
      getAccessToken,
      isClientLoaded,
      isGmailConnected,
      forceRefreshAccessToken,
      peekAccessToken,
      tokenTimeRemaining,
      authPlan
    ]
  );

  /**
   * 🔌 QUEUE SYSTEM INTEGRATION
   *
   * This creates a simple adapter function that converts queue payload format
   * to the format expected by startMarkAsRead, then calls it directly.
   *
   * This way we get all the benefits:
   * ✅ Auth handling & reauth modals
   * ✅ Toast notifications
   * ✅ Progress tracking
   * ✅ Error handling
   * ✅ Logging to Supabase
   * ✅ No code duplication!
   */
  const queueExecutor = useCallback(async (
    payload: MarkReadJobPayload,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ): Promise<ExecutorResult> => {
    logger.debug('[MarkAsRead] Queue executor called with payload:', payload);

    // Set up cancellation handling
    const handleAbort = () => {
      logger.debug('[MarkAsRead] Queue cancellation requested');
      cancelMarkAsRead();
    };

    abortSignal.addEventListener('abort', handleAbort);

    try {
      // Convert queue payload to hook format and call with progress callback
      const senders: SenderToMark[] = payload.senders;

      // Call the existing function which will handle progress updates and completion
      const result = await startMarkAsRead(senders, onProgress);

      // Check the final status to determine the right response
      if (result.success) {
        return {
          success: true,
          processedCount: progress.markedSoFar
        };
      } else {
        // Check the progress status to determine the specific error
        let errorMessage = 'Operation failed';

        if (progress.status === 'cancelled') {
          errorMessage = 'Operation cancelled by user';
        } else if (progress.error) {
          errorMessage = progress.error;
        } else if (abortSignal.aborted) {
          errorMessage = 'Operation cancelled by user';
        }

        return {
          success: false,
          error: errorMessage,
          processedCount: progress.markedSoFar
        };
      }

    } catch (error: any) {
      // Provide specific error messages based on the error type
      let errorMessage = 'Unknown error occurred';

      if (abortSignal.aborted) {
        errorMessage = 'Operation cancelled by user';
      } else if (error.message?.includes('authentication') || error.message?.includes('token')) {
        errorMessage = 'Gmail authentication failed - please reconnect';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error - please check your connection';
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        errorMessage = 'Gmail API rate limit reached - please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        processedCount: progress.markedSoFar
      };
    } finally {
      abortSignal.removeEventListener('abort', handleAbort);
    }
  }, [startMarkAsRead, cancelMarkAsRead, progress.markedSoFar]);

  // Register with queue system
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__queueRegisterExecutor) {
      logger.debug('[MarkAsRead] Registering executor with queue system');
      (window as any).__queueRegisterExecutor('markRead', queueExecutor);
    }
  }, [queueExecutor]);

  return {
    progress,
    startMarkAsRead,
    cancelMarkAsRead,
    reauthModal,
    closeReauthModal,
  };
}
