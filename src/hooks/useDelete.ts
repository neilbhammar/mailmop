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
 */
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useUser } from '@supabase/auth-helpers-react';

// --- Contexts & Hooks ---
import { useAuth } from '@/context/AuthProvider'; // Basic user auth
import { 
  useGmailPermissions, 
  // TypesTokenStatus // Avoid importing unused types if TokenStatus isn't used directly
} from '@/context/GmailPermissionsProvider'; // Gmail token/permission handling

// --- API/Helper Functions ---
import { estimateRuntimeMs, formatDuration, OperationType, OperationMode } from '@/lib/utils/estimateRuntime';
import { buildQuery, RuleGroup } from '@/lib/gmail/buildQuery';
import { fetchMessageIds } from '@/lib/gmail/fetchMessageIds';
import { batchDeleteMessages } from '@/lib/gmail/batchDeleteMessages'; // Our new helper
import { markSenderActionTaken } from '@/lib/storage/senderAnalysis'; // Import the new function

// --- Storage & Logging ---
import { createActionLog, updateActionLog, completeActionLog } from '@/supabase/actions/logAction';
import {
  createActionLog as createLocalActionLog,
  updateSupabaseLogId,
  updateActionProgress,
  completeActionLog as completeLocalActionLog,
  clearCurrentActionLog,
} from '@/lib/storage/actionLog'; // New imports for action logging

// --- Components ---
import { ReauthDialog } from '@/components/modals/ReauthDialog'; // For prompting re-login

// --- Types ---
import { ActionEndType } from '@/types/actions';

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

  const updateProgress = useCallback(
    (newProgress: Partial<DeletingProgress>) => {
      setProgress((prev) => ({ ...prev, ...newProgress }));
    },
    []
  );

  const closeReauthModal = useCallback(() => {
    console.log('[Delete] Closing reauth modal');
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const cancelDelete = useCallback(async () => {
    console.log('[Delete] Cancellation requested');
    isCancelledRef.current = true; // Signal the running process to stop
    updateProgress({ status: 'cancelled' }); // Pass partial update object
    setReauthModal({ isOpen: false, type: 'expired' }); // Close modal if open

    const logId = actionLogIdRef.current;
    if (logId) {
      try {
        await completeActionLog(logId, 'user_stopped', progress.emailsDeletedSoFar);
        completeLocalActionLog('user_stopped');
        console.log('[Delete] Logged cancellation to Supabase and local storage');
      } catch (error) {
        console.error('[Delete] Failed to log cancellation:', error);
      } finally {
        actionLogIdRef.current = null; // Clear the ref
      }
    }
  }, [progress.emailsDeletedSoFar, updateProgress]);

  const startDelete = useCallback(
    async (senders: SenderToDelete[], options?: DeleteOptions): Promise<{ success: boolean }> => {
      console.log('[Delete] Starting deletion process for senders:', senders);
      console.log('[Delete] With filter rules:', options?.filterRules);
      isCancelledRef.current = false; // Reset cancellation flag
      updateProgress({ status: 'preparing', progressPercent: 0, emailsDeletedSoFar: 0 });
      console.log('[Delete] Preparing deletion...');

      // --- 0. Basic Checks --- (User, Senders, GAPI Client)
      if (!user?.id) {
        toast.error('You must be logged in to delete emails.');
        console.error('[Delete] User not logged in.');
        updateProgress({ status: 'error', error: 'User not logged in.' });
        return { success: false };
      }
      if (!senders || senders.length === 0) {
        toast.warning('No senders selected for deletion.');
        console.warn('[Delete] No senders provided.');
        updateProgress({ status: 'idle' }); // Go back to idle
        return { success: false };
      }
      if (!isClientLoaded) {
        console.error('[Delete] Gmail API client is not loaded yet.');
        toast.error('Gmail client not ready', { description: 'Please wait a moment and try again.' });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }

      // --- 1. Initial Token & Connection Check ---
      if (!isGmailConnected) {
        console.log('[Delete] No Gmail connection, showing reauth modal.');
        setReauthModal({ isOpen: true, type: 'expired' });
        updateProgress({ status: 'error', error: 'Gmail not connected.' });
        return { success: false };
      }
      try {
        await getAccessToken(); // Verify refresh token validity and get initial access token
        console.log('[Delete] Initial access token validated/acquired.');
      } catch (error) {
        console.error('[Delete] Failed to validate/acquire initial token:', error);
        setReauthModal({ isOpen: true, type: 'expired' });
        updateProgress({ status: 'error', error: 'Gmail authentication failed.' });
        return { success: false };
      }

      // --- 2. Calculate Estimates --- 
      const totalEmailsEstimate = senders.reduce((sum, s) => sum + s.count, 0);
      updateProgress({ totalEmailsToProcess: totalEmailsEstimate });
      console.log(`[Delete] Total estimated emails: ${totalEmailsEstimate}`);

      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'delete',
        emailCount: totalEmailsEstimate,
        mode: 'single',
      });
      const formattedEta = formatDuration(estimatedRuntimeMs);
      updateProgress({ eta: formattedEta });
      console.log(`[Delete] Estimated runtime: ${formattedEta}`);

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
      console.log(`[Delete] Created local action log: ${clientActionId}`);

      let supabaseLogId: string | undefined;
      try {
        const actionLog = await createActionLog({
          user_id: user.id,
          type: 'delete',
          status: 'started',
          filters: { senders: senders.map(s => s.email), estimatedCount: totalEmailsEstimate },
          estimated_emails: totalEmailsEstimate,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null;
        updateSupabaseLogId(supabaseLogId!); // Update local log with Supabase ID
        console.log(`[Delete] Created Supabase action log: ${supabaseLogId}`);
      } catch (error) {
        console.error('[Delete] Failed to create Supabase action log:', error);
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentActionLog(); // Clean up local log
        return { success: false };
      }

      // --- 4. Execution Phase --- 
      updateProgress({ status: 'deleting', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'deleting' });
      console.log('[Delete] Starting active deletion...');

      (async () => {
        let totalSuccessfullyDeleted = 0;
        let errorMessage: string | undefined;
        let endType: ActionEndType = 'success'; // Assume success initially
        let currentAccessToken: string;

        try {
          for (const sender of senders) {
            if (isCancelledRef.current) {
              console.log(`[Delete] Cancellation detected before processing ${sender.email}`);
              endType = 'user_stopped';
              break; // Exit the sender loop
            }

            console.log(`\n[Delete] Processing sender: ${sender.email} (Est: ${sender.count})`);
            updateProgress({ currentSender: sender.email });

            const query = buildQuery({ 
              type: 'delete', 
              mode: 'single', 
              senderEmail: sender.email,
              filterRules: options?.filterRules
            });
            console.log(`[Delete] Using query: ${query}`);

            let nextPageToken: string | undefined = undefined;
            let senderDeletedCount = 0;
            let batchFetchAttempts = 0;
            const MAX_FETCH_ATTEMPTS = 30; 
            let senderProcessedSuccessfully = true;

            do {
              if (isCancelledRef.current) {
                console.log(`[Delete] Cancellation detected during batch processing for ${sender.email}`);
                endType = 'user_stopped';
                break;
              }

              // --- Token Check & Acquisition before batch ---
              const tokenDetails = peekAccessToken();
              const timeRemaining = tokenTimeRemaining();
              try {
                if (tokenDetails && timeRemaining < TWO_MINUTES_MS) {
                  console.warn(`[Delete] Token expiring soon (in ${formatDuration(timeRemaining)}), forcing refresh...`);
                  currentAccessToken = await forceRefreshAccessToken();
                } else {
                  currentAccessToken = await getAccessToken(); // Gets from memory or refreshes if expired
                }
              } catch (tokenError) {
                console.error(`[Delete] Token acquisition failed for batch:`, tokenError);
                setReauthModal({ isOpen: true, type: 'expired' });
                throw new Error('Gmail authentication failed during deletion.');
              }
              // ---------------------------------------------

              batchFetchAttempts++;
              console.log(`[Delete] Fetching message IDs batch (Attempt ${batchFetchAttempts}) for ${sender.email}...`);

              try {
                const { messageIds, nextPageToken: newPageTokenResult } = await fetchMessageIds(
                    currentAccessToken,
                    query,
                    nextPageToken,
                    DELETION_BATCH_SIZE
                );
                nextPageToken = newPageTokenResult;

                if (messageIds.length === 0) {
                  console.log(`[Delete] No more message IDs found for ${sender.email}.`);
                  break;
                }

                console.log(`[Delete] Found ${messageIds.length} IDs. Attempting batch delete...`);
                await batchDeleteMessages(currentAccessToken, messageIds);

                senderDeletedCount += messageIds.length;
                totalSuccessfullyDeleted += messageIds.length;
                const overallProgress = totalEmailsEstimate > 0
                  ? Math.min(100, Math.round((totalSuccessfullyDeleted / totalEmailsEstimate) * 100))
                  : (nextPageToken ? 50 : 100); 

                console.log(`[Delete] Batch successful for ${sender.email}. Total deleted so far: ${totalSuccessfullyDeleted}`);
                updateProgress({
                    emailsDeletedSoFar: totalSuccessfullyDeleted,
                    progressPercent: overallProgress,
                });
                updateActionProgress(batchFetchAttempts, totalSuccessfullyDeleted);

                if (BATCH_DELAY_MS > 0 && nextPageToken) {
                    await sleep(BATCH_DELAY_MS);
                }

              } catch (fetchOrDeleteError: any) {
                  console.error(`[Delete] Error during fetch/delete batch for ${sender.email}:`, fetchOrDeleteError);
                  errorMessage = `Failed during batch operation for ${sender.email}: ${fetchOrDeleteError.message || 'Unknown error'}`;
                  endType = 'runtime_error';
                  toast.error('Deletion error', { description: errorMessage });
                  senderProcessedSuccessfully = false;
                  break; 
              }

              if (batchFetchAttempts > MAX_FETCH_ATTEMPTS) {
                  console.warn(`[Delete] Reached max fetch attempts (${MAX_FETCH_ATTEMPTS}) for ${sender.email}. Stopping.`);
                   errorMessage = `Reached maximum processing attempts for ${sender.email}.`;
                   endType = 'runtime_error';
                  break;
              }

            } while (nextPageToken && endType === 'success' && !isCancelledRef.current);

            if (senderProcessedSuccessfully && !isCancelledRef.current) {
              try {
                await markSenderActionTaken(sender.email, 'delete');
              } catch (markError) {
                console.error(`[Delete] Failed to mark action taken for ${sender.email}:`, markError);
              }
            }

            if (endType !== 'success' && endType !== 'user_stopped') {
                break; // Stop processing further senders if an error occurred
            }
          } // End of sender loop

          // --- 5. Finalization ---
          console.log(`\n[Delete] Deletion process finished. End type: ${endType}`);
          console.log(`[Delete] Total emails successfully deleted: ${totalSuccessfullyDeleted}`);

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
            toast.success('Deletion Complete', { description: `Successfully deleted ${totalSuccessfullyDeleted.toLocaleString()} emails from ${senders.length} sender(s).` });
          } else if (endType === 'user_stopped') {
            toast.info('Deletion Cancelled', { description: `Deletion stopped after ${totalSuccessfullyDeleted.toLocaleString()} emails.` });
          } // Errors already toasted

        } catch (processError: any) {
            console.error('[Delete] Critical error during deletion process:', processError);
            errorMessage = `An unexpected error occurred: ${processError.message || 'Unknown error'}`;
            endType = 'runtime_error';

            if (supabaseLogId) {
                try {
                    await completeActionLog(supabaseLogId, endType, totalSuccessfullyDeleted, errorMessage);
                    completeLocalActionLog(endType, errorMessage);
                } catch (logError) {
                    console.error("[Delete] Failed to log critical error:", logError);
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

  return {
    progress,
    startDelete,
    cancelDelete,
    reauthModal,
    closeReauthModal,
  };
} 