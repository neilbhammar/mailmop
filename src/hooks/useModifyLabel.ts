/**
 * useModifyLabel.ts
 * 
 * Hook for modifying labels on emails, either for a single sender or in bulk.
 * Supports both adding and removing labels.
 */
import { useState, useCallback, useRef } from 'react';
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
import { processBatchModifyLabels } from '@/lib/gmail/batchModifyLabels';

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
const FETCH_BATCH_SIZE = 1000;  // Updated from 100 to 1000 to match useDelete.ts
const BATCH_DELAY_MS = 150;

/** Possible states during the label modification process */
export type ModifyLabelStatus =
  | 'idle'
  | 'preparing'
  | 'marking'
  | 'completed'
  | 'error'
  | 'cancelled';

/** Progress information for the UI */
export interface ModifyLabelProgress {
  status: ModifyLabelStatus;
  progressPercent: number;
  totalToProcess: number;
  processedSoFar: number;
  currentSender?: string;
  error?: string;
  eta?: string;
}

/** Input format for modifying labels on emails from senders */
export interface SenderToModify {
  email: string;
  emailCount: number;
}

/** Options for label modification */
export interface ModifyLabelOptions {
  senders: SenderToModify[];
  labelIds: string[];
  actionType: 'add' | 'remove';
}

/** State for the re-authentication modal */
interface ReauthModalState {
  isOpen: boolean;
  type: 'expired'; // Simplified type
  eta?: string;
}

// --- Helper Functions ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useModifyLabel() {
  const { user } = useAuth();
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
  const [progress, setProgress] = useState<ModifyLabelProgress>({
    status: 'idle',
    progressPercent: 0,
    totalToProcess: 0,
    processedSoFar: 0,
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
    (newProgress: Partial<ModifyLabelProgress>) => {
      setProgress((prev) => ({ ...prev, ...newProgress }));
    },
    []
  );

  /** Closes the re-authentication modal */
  const closeReauthModal = useCallback(() => {
    console.log('[ModifyLabel] Closing reauth modal');
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Cancels an ongoing label modification process
   */
  const cancelModifyLabel = useCallback(async () => {
    console.log('[ModifyLabel] Cancellation requested');
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
          progress.processedSoFar
        );
        completeLocalActionLog('user_stopped');
        console.log('[ModifyLabel] Logged cancellation');
      } catch (error) {
        console.error('[ModifyLabel] Failed to log cancellation:', error);
      } finally {
        actionLogIdRef.current = null;
      }
    }
  }, [progress.processedSoFar, updateProgress]);

  /**
   * Starts the process of modifying labels
   */
  const startModifyLabel = useCallback(
    async (options: ModifyLabelOptions): Promise<{ success: boolean }> => {
      console.log('[ModifyLabel] Starting label modification:', options);
      isCancelledRef.current = false;

      // --- Basic Checks ---
      if (!user?.id) {
        toast.error('You must be logged in to modify emails.');
        return { success: false };
      }
      if (!options.senders?.length || !options.labelIds?.length) {
        toast.warning('No senders or labels selected.');
        return { success: false };
      }

      // --- Preparation Phase ---
      updateProgress({ status: 'preparing', progressPercent: 0, processedSoFar: 0 });
      
      if (!isClientLoaded) {
        console.error('[ModifyLabel] Gmail API client is not loaded yet.');
        toast.error('Gmail client not ready', {
          description: 'Please wait a moment and try again.'
        });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }
      
      const totalToProcess = options.senders.reduce((sum, s) => sum + s.emailCount, 0);
      updateProgress({ totalToProcess });

      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'mark',
        emailCount: totalToProcess,
        mode: 'single',
      });
      const formattedEta = formatDuration(estimatedRuntimeMs);
      updateProgress({ eta: formattedEta });

      // --- Token & Permission Checks (New Strategy) ---
      if (!isGmailConnected) {
        console.log('[ModifyLabel] No Gmail connection (no refresh token), showing reauth modal.');
        setReauthModal({ isOpen: true, type: 'expired', eta: formattedEta });
        updateProgress({ status: 'error', error: 'Gmail not connected. Please reconnect.' });
        return { success: false };
      }

      try {
        await getAccessToken(); // Verify refresh token validity and get initial access token
        console.log('[ModifyLabel] Initial access token validated/acquired.');
      } catch (error) {
        console.error('[ModifyLabel] Failed to validate/acquire initial token:', error);
        setReauthModal({ isOpen: true, type: 'expired', eta: formattedEta });
        updateProgress({ status: 'error', error: 'Gmail authentication failed. Please reconnect.' });
        return { success: false };
      }
      // Removed pre-operation token expiry check based on estimatedRuntimeMs

      // --- Logging Initialization ---
      const clientActionId = uuidv4();
      createLocalActionLog({
        clientActionId,
        type: 'modify_label',
        estimatedRuntimeMs,
        totalEmails: totalToProcess,
        totalEstimatedBatches: Math.ceil(totalToProcess / FETCH_BATCH_SIZE),
        query: `${options.actionType === 'add' ? 'Adding' : 'Removing'} labels for ${options.senders.length} senders`,
      });

      let supabaseLogId: string | undefined;
      try {
        const actionLog = await createActionLog({
          user_id: user.id,
          type: 'modify_label',
          status: 'started',
          filters: {
            senders: options.senders.map(s => s.email),
            labelIds: options.labelIds,
            actionType: options.actionType,
            estimatedCount: totalToProcess
          },
          estimated_emails: totalToProcess,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null;
        updateSupabaseLogId(supabaseLogId!);
      } catch (error) {
        console.error('[ModifyLabel] Failed to create action log:', error);
        toast.error('Failed to start label modification.');
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentActionLog();
        return { success: false };
      }

      // --- Execution Phase ---
      updateProgress({ status: 'marking', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'marking' });

      // Run the actual modification process in the background
      (async () => {
        let totalProcessed = 0;
        let errorMessage: string | undefined;
        let endType: ActionEndType = 'success';
        let currentAccessToken: string; // To store the token for the current batch

        try {
          for (const sender of options.senders) {
            if (isCancelledRef.current) {
              console.log(`[ModifyLabel] Cancellation detected before processing ${sender.email}`);
              break;
            }

            console.log(`\n[ModifyLabel] Processing sender: ${sender.email}`);
            updateProgress({ currentSender: sender.email });

            // Build query to get messages from this sender
            const query = buildQuery({ 
              type: 'mark',
              mode: 'read',
              senderEmail: sender.email,
              additionalTerms: []
            });
            console.log(`[ModifyLabel] Using query: ${query}`);

            let nextPageToken: string | undefined = undefined;
            let batchFetchAttempts = 0;
            const MAX_FETCH_ATTEMPTS = 30;

            do {
              if (isCancelledRef.current) {
                console.log(`[ModifyLabel] Cancellation detected during batch processing`);
                break;
              }

              // --- Token Check & Acquisition before batch (New Strategy) ---
              const tokenDetails = peekAccessToken();
              const timeRemaining = tokenTimeRemaining();
              try {
                if (tokenDetails && timeRemaining < TWO_MINUTES_MS) {
                  console.warn(`[ModifyLabel] Token expiring soon (in ${formatDuration(timeRemaining)}), forcing refresh...`);
                  currentAccessToken = await forceRefreshAccessToken();
                } else {
                  currentAccessToken = await getAccessToken(); // Gets from memory or refreshes if expired
                }
                console.log(`[ModifyLabel] Token acquired for batch processing sender: ${sender.email}`);
              } catch (tokenError: any) {
                console.error(`[ModifyLabel] Token acquisition failed for batch processing ${sender.email}:`, tokenError);
                const remainingEmailsForEta = totalToProcess - totalProcessed;
                const remainingTimeMsForEta = estimateRuntimeMs({ 
                  operationType: 'mark', // Assuming 'mark' is generic enough for ETA here
                  emailCount: remainingEmailsForEta, 
                  mode: 'single' 
                });
                setReauthModal({ 
                  isOpen: true, 
                  type: 'expired', // Simplified type
                  eta: formatDuration(remainingTimeMsForEta) 
                });
                throw new Error("Gmail authentication failed during operation. Please re-authenticate."); 
              }
              // ---------------------------------------------

              batchFetchAttempts++;
              console.log(`[ModifyLabel] Fetching message IDs batch (Attempt ${batchFetchAttempts})`);

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
                  console.log(`[ModifyLabel] No more messages found.`);
                  break;
                }

                console.log(`[ModifyLabel] Found ${messageIds.length} messages. Modifying labels...`);

                // Use currentAccessToken obtained above
                const failedBatches = await processBatchModifyLabels(
                  currentAccessToken,
                  messageIds,
                  {
                    addLabelIds: options.actionType === 'add' ? options.labelIds : undefined,
                    removeLabelIds: options.actionType === 'remove' ? options.labelIds : undefined,
                  }
                );

                if (failedBatches.length > 0) {
                  console.warn(`[ModifyLabel] Some batches failed:`, failedBatches);
                }
                
                totalProcessed += messageIds.length;
                const overallProgress = totalToProcess > 0
                  ? Math.min(100, Math.round((totalProcessed / totalToProcess) * 100))
                  : (nextPageToken ? 50 : 100);

                console.log(`[ModifyLabel] Batch successful. Total processed: ${totalProcessed}`);
                updateProgress({
                  processedSoFar: totalProcessed,
                  progressPercent: overallProgress,
                });

                if (BATCH_DELAY_MS > 0 && nextPageToken) {
                  await sleep(BATCH_DELAY_MS);
                }

              } catch (error: any) {
                console.error(`[ModifyLabel] Error during batch:`, error);
                errorMessage = `Failed during batch operation: ${error.message || 'Unknown error'}`;
                toast.error('Error modifying labels', { description: errorMessage });
                break;
              }

              if (batchFetchAttempts > MAX_FETCH_ATTEMPTS) {
                console.warn(`[ModifyLabel] Reached max fetch attempts`);
                errorMessage = `Reached maximum processing attempts.`;
                break;
              }

            } while (nextPageToken);
          }

          // --- Finalization ---
          console.log(`\n[ModifyLabel] Process finished. End type: ${endType}`);
          console.log(`[ModifyLabel] Total emails processed: ${totalProcessed}`);

          // Update Supabase log
          await completeActionLog(
            supabaseLogId!,
            endType,
            totalProcessed,
            errorMessage
          );

          // Update local storage log
          completeLocalActionLog(endType, errorMessage);

          updateProgress({
            status: endType === 'success' ? 'completed' : (endType === 'user_stopped' ? 'cancelled' : 'error'),
            progressPercent: endType === 'success' ? 100 : progress.progressPercent,
            processedSoFar: totalProcessed,
            error: errorMessage,
            currentSender: undefined,
          });

          const action = options.actionType === 'add' ? 'added to' : 'removed from';
          if (endType === 'success') {
            toast.success('Label Modification Complete', {
              description: `Successfully ${action} ${totalProcessed.toLocaleString()} emails from ${options.senders.length} sender(s).`
            });
          } else if (endType === 'user_stopped') {
            toast.info('Operation Cancelled', {
              description: `Stopped after processing ${totalProcessed.toLocaleString()} emails.`
            });
          }

        } catch (error: any) {
          console.error('[ModifyLabel] Critical error:', error);
          errorMessage = `An unexpected error occurred: ${error.message || 'Unknown error'}`;
          endType = 'runtime_error';

          if (supabaseLogId) {
            try {
              await completeActionLog(supabaseLogId, endType, totalProcessed, errorMessage);
              completeLocalActionLog(endType, errorMessage);
            } catch (logError) {
              console.error("[ModifyLabel] Failed to log critical error:", logError);
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
      // tokenStatus, // Removed
      updateProgress,
      getAccessToken,
      // requestPermissions, // Removed
      isClientLoaded,
      isGmailConnected, // Added
      forceRefreshAccessToken, // Added
      peekAccessToken, // Added
      tokenTimeRemaining // Added
    ]
  );

  return {
    progress,
    startModifyLabel,
    cancelModifyLabel,
    reauthModal,
    closeReauthModal,
  };
} 