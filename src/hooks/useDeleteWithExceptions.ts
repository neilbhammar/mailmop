/**
 * useDeleteWithExceptions.ts
 * 
 * Hook for handling email deletion with filtering functionality.
 * Similar to useDelete but:
 * 1. Does not mark senders as "deleted" in IndexedDB
 * 2. Supports filter rules for partial deletion
 * 3. Maintains separate progress tracking
 */
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useUser } from '@supabase/auth-helpers-react';

// --- Contexts & Hooks ---
import { useAuth } from '@/context/AuthProvider';
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

// --- Types ---
import { ActionEndType } from '@/types/actions';

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
  type: 'expired' | 'will_expire_during_operation';
  eta?: string;
}

// --- Helper Functions ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useDeleteWithExceptions() {
  const { user } = useAuth();
  const {
    tokenStatus,
    getAccessToken,
    requestPermissions,
    isClientLoaded
  } = useGmailPermissions();

  // State for overall progress visible to the UI
  const [progress, setProgress] = useState<DeletingProgress>({
    status: 'idle',
    progressPercent: 0,
    totalEmailsToProcess: 0,
    emailsDeletedSoFar: 0,
  });

  // State for managing the re-authentication dialog
  const [reauthModal, setReauthModal] = useState<ReauthModalState>({
    isOpen: false,
    type: 'expired',
  });

  // Use a ref to keep track of the Supabase action log ID
  const actionLogIdRef = useRef<string | null>(null);
  // Ref to signal cancellation to the running background process
  const isCancelledRef = useRef<boolean>(false);

  /**
   * Updates the progress state and optionally logs progress
   */
  const updateProgress = useCallback(
    (newProgress: Partial<DeletingProgress>) => {
      setProgress((prev) => {
        const updated = { ...prev, ...newProgress };
        return updated;
      });
    },
    []
  );

  /** Closes the re-authentication modal */
  const closeReauthModal = useCallback(() => {
    console.log('[DeleteWithExceptions] Closing reauth modal');
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Cancels an ongoing deletion process.
   */
  const cancelDelete = useCallback(async () => {
    console.log('[DeleteWithExceptions] Cancellation requested');
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
          progress.emailsDeletedSoFar
        );
        completeLocalActionLog('user_stopped', 'User cancelled the deletion');
        console.log('[DeleteWithExceptions] Logged cancellation');
      } catch (error) {
        console.error('[DeleteWithExceptions] Failed to log cancellation:', error);
      } finally {
        actionLogIdRef.current = null;
      }
    }
  }, [progress.emailsDeletedSoFar, updateProgress]);

  /**
   * Starts the email deletion process with filtering.
   */
  const startDeleteWithExceptions = useCallback(
    async (
      senders: SenderToDelete[],
      filterRules: RuleGroup[]
    ): Promise<{ success: boolean }> => {
      console.log('[DeleteWithExceptions] Starting filtered deletion for senders:', senders);
      console.log('[DeleteWithExceptions] Using filter rules:', filterRules);
      isCancelledRef.current = false;

      // --- Basic Checks ---
      if (!user?.id) {
        toast.error('You must be logged in to delete emails.');
        return { success: false };
      }
      if (!senders || senders.length === 0) {
        toast.warning('No senders selected for deletion.');
        return { success: false };
      }

      // --- Preparation Phase ---
      updateProgress({ status: 'preparing', progressPercent: 0, emailsDeletedSoFar: 0 });
      
      if (!isClientLoaded) {
        console.error('[DeleteWithExceptions] Gmail API client is not loaded yet.');
        toast.error('Gmail client not ready', {
          description: 'Please wait a moment and try again.'
        });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }
      
      const totalEmailsEstimate = senders.reduce((sum, s) => sum + s.count, 0);
      updateProgress({ totalEmailsToProcess: totalEmailsEstimate });

      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'delete',
        emailCount: totalEmailsEstimate,
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
            senders: senders.map(s => s.email),
            rules: filterRules,
            estimatedCount: totalEmailsEstimate
          },
          estimated_emails: totalEmailsEstimate,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null;
        updateSupabaseLogId(supabaseLogId!);
      } catch (error) {
        console.error('[DeleteWithExceptions] Failed to create action log:', error);
        toast.error('Failed to start deletion process.');
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentActionLog();
        return { success: false };
      }

      // --- Execution Phase ---
      updateProgress({ status: 'deleting', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'deleting' });

      // Run the actual deletion in the background
      (async () => {
        let totalSuccessfullyDeleted = 0;
        let errorMessage: string | undefined;
        let endType: ActionEndType = 'success';

        try {
          for (const sender of senders) {
            if (isCancelledRef.current) {
              console.log(`[DeleteWithExceptions] Cancellation detected before processing ${sender.email}`);
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
              if (isCancelledRef.current) {
                console.log(`[DeleteWithExceptions] Cancellation detected during batch processing`);
                endType = 'user_stopped';
                break;
              }

              const currentTokenStatus = tokenStatus;
              if (currentTokenStatus.timeRemaining < TWO_MINUTES_MS) {
                console.warn('[DeleteWithExceptions] Token expiring soon, pausing for reauth');
                const remainingEmails = totalEmailsEstimate - totalSuccessfullyDeleted;
                const remainingTimeMs = estimateRuntimeMs({ 
                  operationType: 'delete', 
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
              console.log(`[DeleteWithExceptions] Fetching message IDs batch (Attempt ${batchFetchAttempts})`);

              try {
                const accessToken = await getAccessToken();
                const { messageIds, nextPageToken: newPageToken } = await fetchMessageIds(
                  accessToken,
                  query,
                  nextPageToken,
                  DELETION_BATCH_SIZE
                );

                nextPageToken = newPageToken;

                if (messageIds.length === 0) {
                  console.log(`[DeleteWithExceptions] No more message IDs found.`);
                  break;
                }

                console.log(`[DeleteWithExceptions] Found ${messageIds.length} IDs. Attempting batch delete...`);

                await batchDeleteMessages(accessToken, messageIds);

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

            } while (nextPageToken && endType === 'success');

            if (endType !== 'success' && endType !== 'user_stopped') {
              break;
            }
          }

          // --- Finalization ---
          console.log(`\n[DeleteWithExceptions] Process finished. End type: ${endType}`);
          console.log(`[DeleteWithExceptions] Total emails deleted: ${totalSuccessfullyDeleted}`);

          await completeActionLog(
            supabaseLogId!,
            endType,
            totalSuccessfullyDeleted,
            errorMessage
          );

          completeLocalActionLog(endType, errorMessage);

          updateProgress({
            status: endType === 'success' ? 'completed' : (endType === 'user_stopped' ? 'cancelled' : 'error'),
            progressPercent: endType === 'success' ? 100 : progress.progressPercent,
            emailsDeletedSoFar: totalSuccessfullyDeleted,
            error: errorMessage,
            currentSender: undefined,
          });

          if (endType === 'success') {
            toast.success('Filtered Deletion Complete', {
              description: `Successfully deleted ${totalSuccessfullyDeleted.toLocaleString()} emails from ${senders.length} sender(s).`
            });
          } else if (endType === 'user_stopped') {
            toast.info('Deletion Cancelled', {
              description: `Deletion stopped after ${totalSuccessfullyDeleted.toLocaleString()} emails.`
            });
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

          updateProgress({
            status: 'error',
            error: errorMessage,
            currentSender: undefined,
          });
          toast.error('Deletion Failed', { description: errorMessage });
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
    startDeleteWithExceptions,
    cancelDelete,
    reauthModal,
    closeReauthModal,
  };
} 