/**
 * useMarkAsRead.ts
 * 
 * Hook for marking emails as read, either for a single sender or in bulk.
 * Simpler version of useDeleteWithExceptions that:
 * 1. Only targets unread messages
 * 2. Uses batchModify instead of delete
 * 3. Doesn't need IndexedDB tracking
 */
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// --- Contexts & Hooks ---
import { useAuth } from '@/context/AuthProvider';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';

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
  type: 'expired' | 'will_expire_during_operation';
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
  const { user } = useAuth();
  const {
    tokenStatus,
    getAccessToken,
    requestPermissions,
    isClientLoaded
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
    console.log('[MarkAsRead] Closing reauth modal');
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Cancels an ongoing mark as read process
   */
  const cancelMarkAsRead = useCallback(async () => {
    console.log('[MarkAsRead] Cancellation requested');
    isCancelledRef.current = true;
    updateProgress({ status: 'cancelled', progressPercent: 0 });
    setReauthModal({ isOpen: false, type: 'expired' });

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
        console.log('[MarkAsRead] Logged cancellation');
      } catch (error) {
        console.error('[MarkAsRead] Failed to log cancellation:', error);
      } finally {
        actionLogIdRef.current = null;
      }
    }
  }, [progress.markedSoFar, updateProgress]);

  /**
   * Starts the process of marking emails as read
   */
  const startMarkAsRead = useCallback(
    async (senders: SenderToMark[]): Promise<{ success: boolean }> => {
      console.log('[MarkAsRead] Starting mark as read for senders:', senders);
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
        console.error('[MarkAsRead] Gmail API client is not loaded yet.');
        toast.error('Gmail client not ready', {
          description: 'Please wait a moment and try again.'
        });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }
      
      const totalToProcess = senders.reduce((sum, s) => sum + s.unreadCount, 0);
      updateProgress({ totalToProcess });

      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'mark',
        emailCount: totalToProcess,
        mode: 'single',
      });
      const formattedEta = formatDuration(estimatedRuntimeMs);
      updateProgress({ eta: formattedEta });

      // --- Token & Permission Checks ---
      if (tokenStatus.state !== 'valid' && tokenStatus.state !== 'expiring_soon') {
        if (tokenStatus.state === 'expired') {
          setReauthModal({ isOpen: true, type: 'expired' });
          updateProgress({ status: 'idle' });
          return { success: false };
        } else {
          toast.error('Gmail connection error. Please reconnect.', {
            description: `Token state is ${tokenStatus.state}. Please grant permissions or reconnect.`,
            action: { label: 'Reconnect', onClick: () => requestPermissions() }
          });
          updateProgress({ status: 'error', error: `Gmail token state: ${tokenStatus.state}` });
          return { success: false };
        }
      }

      if (tokenStatus.timeRemaining < estimatedRuntimeMs) {
        setReauthModal({ isOpen: true, type: 'will_expire_during_operation', eta: formattedEta });
        updateProgress({ status: 'idle' });
        return { success: false };
      }

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
            senders: senders.map(s => s.email),
            estimatedCount: totalToProcess
          },
          estimated_emails: totalToProcess,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null;
        updateSupabaseLogId(supabaseLogId!);
      } catch (error) {
        console.error('[MarkAsRead] Failed to create action log:', error);
        toast.error('Failed to start marking as read.');
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentActionLog();
        return { success: false };
      }

      // --- Execution Phase ---
      updateProgress({ status: 'marking', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'marking' });

      // Run the actual marking process in the background
      (async () => {
        let totalMarkedAsRead = 0;
        let errorMessage: string | undefined;
        let endType: ActionEndType = 'success';

        try {
          for (const sender of senders) {
            if (isCancelledRef.current) {
              console.log(`[MarkAsRead] Cancellation detected before processing ${sender.email}`);
              break;
            }

            console.log(`\n[MarkAsRead] Processing sender: ${sender.email}`);
            updateProgress({ currentSender: sender.email });

            // Build query to get only unread messages from this sender
            const query = buildQuery({ 
              type: 'mark', 
              mode: 'read', 
              senderEmail: sender.email,
              additionalTerms: ['is:unread']
            });
            console.log(`[MarkAsRead] Using query: ${query}`);

            let nextPageToken: string | undefined = undefined;
            let batchFetchAttempts = 0;
            const MAX_FETCH_ATTEMPTS = 30;

            do {
              if (isCancelledRef.current) {
                console.log(`[MarkAsRead] Cancellation detected during batch processing`);
                break;
              }

              const currentTokenStatus = tokenStatus;
              if (currentTokenStatus.timeRemaining < TWO_MINUTES_MS) {
                console.warn('[MarkAsRead] Token expiring soon, pausing for reauth');
                const remainingEmails = totalToProcess - totalMarkedAsRead;
                const remainingTimeMs = estimateRuntimeMs({ 
                  operationType: 'mark', 
                  emailCount: remainingEmails, 
                  mode: 'single' 
                });
                setReauthModal({ 
                  isOpen: true, 
                  type: 'will_expire_during_operation', 
                  eta: formatDuration(remainingTimeMs) 
                });
                throw new Error("Token expired during operation. Please re-authenticate and try again.");
              }

              batchFetchAttempts++;
              console.log(`[MarkAsRead] Fetching message IDs batch (Attempt ${batchFetchAttempts})`);

              try {
                const accessToken = await getAccessToken();
                const { messageIds, nextPageToken: newPageToken } = await fetchMessageIds(
                  accessToken,
                  query,
                  nextPageToken,
                  FETCH_BATCH_SIZE
                );

                nextPageToken = newPageToken;

                if (messageIds.length === 0) {
                  console.log(`[MarkAsRead] No more unread messages found.`);
                  break;
                }

                console.log(`[MarkAsRead] Found ${messageIds.length} unread messages. Marking as read...`);

                // Process in chunks of MODIFY_BATCH_SIZE
                for (let i = 0; i < messageIds.length; i += MODIFY_BATCH_SIZE) {
                  const batch = messageIds.slice(i, i + MODIFY_BATCH_SIZE);
                  await batchMarkAsRead(accessToken, batch);
                  
                  totalMarkedAsRead += batch.length;
                  const overallProgress = totalToProcess > 0
                    ? Math.min(100, Math.round((totalMarkedAsRead / totalToProcess) * 100))
                    : (nextPageToken ? 50 : 100);

                  console.log(`[MarkAsRead] Batch successful. Total marked: ${totalMarkedAsRead}`);
                  updateProgress({
                    markedSoFar: totalMarkedAsRead,
                    progressPercent: overallProgress,
                  });
                }

                if (BATCH_DELAY_MS > 0 && nextPageToken) {
                  await sleep(BATCH_DELAY_MS);
                }

              } catch (error: any) {
                console.error(`[MarkAsRead] Error during batch:`, error);
                errorMessage = `Failed during batch operation: ${error.message || 'Unknown error'}`;
                toast.error('Error marking as read', { description: errorMessage });
                break;
              }

              if (batchFetchAttempts > MAX_FETCH_ATTEMPTS) {
                console.warn(`[MarkAsRead] Reached max fetch attempts`);
                errorMessage = `Reached maximum processing attempts.`;
                break;
              }

            } while (nextPageToken);
          }

          // --- Finalization ---
          console.log(`\n[MarkAsRead] Process finished. End type: ${endType}`);
          console.log(`[MarkAsRead] Total emails marked as read: ${totalMarkedAsRead}`);

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

        } catch (error: any) {
          console.error('[MarkAsRead] Critical error:', error);
          errorMessage = `An unexpected error occurred: ${error.message || 'Unknown error'}`;
          endType = 'runtime_error';

          if (supabaseLogId) {
            try {
              await completeActionLog(supabaseLogId, endType, totalMarkedAsRead, errorMessage);
              completeLocalActionLog(endType, errorMessage);
            } catch (logError) {
              console.error("[MarkAsRead] Failed to log critical error:", logError);
            }
          }

          updateProgress({
            status: 'error',
            error: errorMessage,
            currentSender: undefined,
          });
          toast.error('Operation Failed', { description: errorMessage });
        } finally {
          actionLogIdRef.current = null;
        }
      })();

      return { success: true };
    },
    [
      user?.id,
      tokenStatus,
      updateProgress,
      getAccessToken,
      requestPermissions,
      isClientLoaded
    ]
  );

  return {
    progress,
    startMarkAsRead,
    cancelMarkAsRead,
    reauthModal,
    closeReauthModal,
  };
} 