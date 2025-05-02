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
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'; // Gmail token/permission handling

// --- API/Helper Functions ---
import { estimateRuntimeMs, formatDuration, OperationType, OperationMode } from '@/lib/utils/estimateRuntime';
import { buildQuery } from '@/lib/gmail/buildQuery';
import { fetchMessageIds } from '@/lib/gmail/fetchMessageIds';
import { batchDeleteMessages } from '@/lib/gmail/batchDeleteMessages'; // Our new helper
import { markSenderActionTaken } from '@/lib/storage/senderAnalysis'; // Import the new function

// --- Storage & Logging ---
import { createActionLog, updateActionLog, completeActionLog } from '@/supabase/actions/logAction';
import {
  createLocalActionLog,
  updateAnalysisId, // Re-using this to store Supabase ID
  updateAnalysisProgress, // Re-using this to track progress
  completeAnalysis, // Re-using this to mark completion
  clearCurrentAnalysis, // Re-using this to clear log if needed
  getCurrentAnalysis, // Re-using this to check for ongoing ops
} from '@/lib/storage/actionLog'; // Re-using analysis log structure for deletion

// --- Components ---
import { ReauthDialog } from '@/components/modals/ReauthDialog'; // For prompting re-login

// --- Types ---
import { ActionEndType } from '@/types/actions';
import { TokenStatus } from '@/types/gmail'; // Make sure this is exported from types/gmail

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

/** State for the re-authentication modal */
interface ReauthModalState {
  isOpen: boolean;
  type: 'expired' | 'will_expire_during_operation';
  eta?: string; // Estimated time for the operation
}

// --- Helper Functions ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- The Hook ---

export function useDelete() {
  const { user } = useAuth(); // Get Supabase user session
  const {
    tokenStatus,
    getAccessToken,
    requestPermissions,
    isClientLoaded
  } = useGmailPermissions(); // Hook for managing Gmail token

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
  // This avoids state updates triggering unwanted effects during the async process
  const actionLogIdRef = useRef<string | null>(null);
  // Ref to signal cancellation to the running background process
  const isCancelledRef = useRef<boolean>(false);

  /**
   * Updates the progress state and optionally logs progress
   * @param newProgress Partial or full progress update
   */
  const updateProgress = useCallback(
    (newProgress: Partial<DeletingProgress>) => {
      setProgress((prev) => {
        const updated = { ...prev, ...newProgress };
        // Optional: Could add logic here to update local storage progress too
        // updateAnalysisProgress(updated.emailsDeletedSoFar, ??batchIndex??); // Need adaptation if using this
        return updated;
      });
    },
    []
  );

  /** Closes the re-authentication modal */
  const closeReauthModal = useCallback(() => {
    console.log('[Delete] Closing reauth modal');
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
    // If closing because re-auth was successful, maybe trigger retry?
    // For now, just closes it. The user might need to restart the delete action.
  }, []);

  /**
   * Cancels an ongoing deletion process.
   */
  const cancelDelete = useCallback(async () => {
    console.log('[Delete] Cancellation requested');
    isCancelledRef.current = true; // Signal the running process to stop
    updateProgress({ status: 'cancelled', progressPercent: 0 });
    setReauthModal({ isOpen: false, type: 'expired' }); // Close modal if open

    // Log cancellation to Supabase if an action was started
    const logId = actionLogIdRef.current;
    if (logId) {
      try {
        await completeActionLog(
          logId,
          'user_stopped',
          progress.emailsDeletedSoFar // Log how many were deleted before stopping
        );
        // Also update the local log
        completeAnalysis('user_stopped', 'User cancelled the deletion');
        console.log('[Delete] Logged cancellation to Supabase and local storage');
      } catch (error) {
        console.error('[Delete] Failed to log cancellation:', error);
      } finally {
        actionLogIdRef.current = null; // Clear the ref
      }
    }
  }, [progress.emailsDeletedSoFar, updateProgress]); // Add updateProgress dependency

  /**
   * Starts the email deletion process.
   * @param senders An array of sender objects with email and estimated count.
   */
  const startDelete = useCallback(
    async (senders: SenderToDelete[]): Promise<{ success: boolean }> => {
      console.log('[Delete] Starting deletion process for senders:', senders);
      isCancelledRef.current = false; // Reset cancellation flag

      // --- 0. Basic Checks ---
      if (!user?.id) {
        toast.error('You must be logged in to delete emails.');
        console.error('[Delete] User not logged in.');
        return { success: false };
      }
      if (!senders || senders.length === 0) {
        toast.warning('No senders selected for deletion.');
        console.warn('[Delete] No senders provided.');
        return { success: false };
      }

      // --- 1. Preparation Phase ---
      updateProgress({ status: 'preparing', progressPercent: 0, emailsDeletedSoFar: 0 });
      console.log('[Delete] Preparing deletion...');
      
      // --- NEW: Check if GAPI client is loaded BEFORE token checks/API calls ---
      if (!isClientLoaded) {
        console.error('[Delete] Gmail API client is not loaded yet.');
        toast.error('Gmail client not ready', {
          description: 'Please wait a moment and try again.'
        });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }
      
      // Calculate total estimated emails
      const totalEmailsEstimate = senders.reduce((sum, s) => sum + s.count, 0);
      updateProgress({ totalEmailsToProcess: totalEmailsEstimate });
      console.log(`[Delete] Total estimated emails: ${totalEmailsEstimate}`);

      // Estimate runtime - use 'delete' type and 'single' mode (as we process sender by sender)
      // Note: 'single' mode in estimateRuntimeMs currently defaults to using the passed count directly.
      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'delete',
        emailCount: totalEmailsEstimate,
        mode: 'single', // Signifies processing based on provided count, not full/quick scan
      });
      const formattedEta = formatDuration(estimatedRuntimeMs);
      updateProgress({ eta: formattedEta });
      console.log(`[Delete] Estimated runtime: ${formattedEta}`);

      // --- 2. Token & Permission Checks ---
      // Check if token state is not usable (covers expired, no_token, error implicitly)
      if (tokenStatus.state !== 'valid' && tokenStatus.state !== 'expiring_soon') {
        // Handle expired vs. other issues separately for better messaging/action
        if (tokenStatus.state === 'expired') {
            console.log('[Delete] Token expired, requesting reauth');
            setReauthModal({ isOpen: true, type: 'expired' });
            updateProgress({ status: 'idle' });
            return { success: false };
        } else {
            // Covers 'no_token', 'error', or any other non-valid state
            toast.error('Gmail connection error. Please reconnect.', {
                description: `Token state is ${tokenStatus.state}. Please grant permissions or reconnect.`, // More specific error
                action: { label: 'Reconnect', onClick: () => requestPermissions() }
            });
            updateProgress({ status: 'error', error: `Gmail token state: ${tokenStatus.state}` });
            return { success: false };
        }
      }
      // If we get here, token is 'valid' or 'expiring_soon'
      // Check if token will expire *during* the operation
      if (tokenStatus.timeRemaining < estimatedRuntimeMs) {
          console.log('[Delete] Token will expire during operation, requesting reauth');
          setReauthModal({ isOpen: true, type: 'will_expire_during_operation', eta: formattedEta });
          updateProgress({ status: 'idle' }); // Go back to idle
          return { success: false };
      }


      // --- 3. Logging Initialization ---
      const clientActionId = uuidv4(); // Unique ID for this specific run
      // We can re-use the analysis log structure for simplicity
      createLocalActionLog({
        clientActionId,
        type: 'delete', // Specify the operation type
        estimatedRuntimeMs,
        totalEmails: totalEmailsEstimate,
        totalEstimatedBatches: Math.ceil(totalEmailsEstimate / DELETION_BATCH_SIZE), // Rough batch estimate
        query: `Deleting from ${senders.length} senders`, // Simple description
      });
      console.log(`[Delete] Created local action log: ${clientActionId}`);

      let supabaseLogId: string | undefined;
      try {
      const actionLog = await createActionLog({
        user_id: user.id,
        type: 'delete',
        status: 'started',
          filters: { // Store which senders were targeted
            senders: senders.map(s => s.email),
            estimatedCount: totalEmailsEstimate
          },
          estimated_emails: totalEmailsEstimate,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null; // Store the ID
        updateAnalysisId(supabaseLogId!); // Update local log with Supabase ID
        console.log(`[Delete] Created Supabase action log: ${supabaseLogId}`);
      } catch (error) {
        console.error('[Delete] Failed to create Supabase action log:', error);
        toast.error('Failed to start deletion process.', {
          description: 'Could not log the action. Please try again.',
        });
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentAnalysis(); // Clean up local log
        return { success: false };
      }

      // --- 4. Execution Phase ---
      updateProgress({ status: 'deleting', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'deleting' });
      console.log('[Delete] Starting active deletion...');

      // Run the actual deletion in the background (don't await here)
      (async () => {
        let totalSuccessfullyDeleted = 0;
        let errorMessage: string | undefined;
        let endType: ActionEndType = 'success'; // Assume success initially

        try {
          for (const sender of senders) {
            // Check for cancellation before processing each sender
            if (isCancelledRef.current) {
              console.log(`[Delete] Cancellation detected before processing ${sender.email}`);
              endType = 'user_stopped';
              break; // Exit the sender loop
            }

            console.log(`\n[Delete] Processing sender: ${sender.email} (Est: ${sender.count})`);
            updateProgress({ currentSender: sender.email });

            // Pass mode: 'single' to buildQuery
            const query = buildQuery({ type: 'delete', mode: 'single', senderEmail: sender.email });
            console.log(`[Delete] Using query: ${query}`);

            let nextPageToken: string | undefined = undefined;
            let senderDeletedCount = 0;
            let batchFetchAttempts = 0; // Limit attempts per sender
            const MAX_FETCH_ATTEMPTS = 30; // Avoid infinite loops if something goes wrong
            let senderProcessedSuccessfully = true; // Track success for this sender

            do {
              // Check for cancellation before each fetch/delete batch
              if (isCancelledRef.current) {
                console.log(`[Delete] Cancellation detected during batch processing for ${sender.email}`);
                endType = 'user_stopped';
                break; // Exit the batch loop for this sender
              }

              // --- Token Check before batch ---
              // NOTE: Re-check tokenStatus here as it might have changed due to background updates
              const currentTokenStatus = tokenStatus; // Capture current status for this check
              if (currentTokenStatus.timeRemaining < TWO_MINUTES_MS) {
                   console.warn('[Delete] Token expiring soon, pausing for reauth');
                   // Update ETA based on remaining emails
                   const remainingEmails = totalEmailsEstimate - totalSuccessfullyDeleted;
                   const remainingTimeMs = estimateRuntimeMs({ operationType: 'delete', emailCount: remainingEmails, mode: 'single' });
                   setReauthModal({ isOpen: true, type: 'will_expire_during_operation', eta: formatDuration(remainingTimeMs) });
                   // How to pause and resume? For now, we'll error out.
                   // A more complex implementation could use a Promise that resolves after re-auth.
                   throw new Error("Token expired during operation. Please re-authenticate and try again.");
              }

              batchFetchAttempts++;
              console.log(`[Delete] Fetching message IDs batch (Attempt ${batchFetchAttempts}) for ${sender.email}...`);

              try {
                // Get access token just before the API call
                const accessToken = await getAccessToken();
                // Pass maxResults to fetchMessageIds
                const { messageIds, nextPageToken: newPageToken } = await fetchMessageIds(
                    accessToken,
                    query,
                    nextPageToken,
                    DELETION_BATCH_SIZE // Fetch up to 1000 IDs
                );

                nextPageToken = newPageToken; // Update for the next loop iteration

                if (messageIds.length === 0) {
                  console.log(`[Delete] No more message IDs found for ${sender.email}.`);
                  break; // Exit batch loop for this sender
                }

                console.log(`[Delete] Found ${messageIds.length} IDs. Attempting batch delete...`);

                // --- Perform Batch Delete ---
                await batchDeleteMessages(accessToken, messageIds);

                // Update counts and progress
                senderDeletedCount += messageIds.length;
                totalSuccessfullyDeleted += messageIds.length;
                const overallProgress = totalEmailsEstimate > 0
                  ? Math.min(100, Math.round((totalSuccessfullyDeleted / totalEmailsEstimate) * 100))
                  : (nextPageToken ? 50 : 100); // Avoid 0 division, give some progress indication

                console.log(`[Delete] Batch successful for ${sender.email}. Total deleted so far: ${totalSuccessfullyDeleted}`);
                updateProgress({
                    emailsDeletedSoFar: totalSuccessfullyDeleted,
                    progressPercent: overallProgress,
                });
                // Update local storage log
                updateAnalysisProgress(batchFetchAttempts, totalSuccessfullyDeleted);


                // Optional delay
                if (BATCH_DELAY_MS > 0 && nextPageToken) {
                    await sleep(BATCH_DELAY_MS);
                }

              } catch (fetchOrDeleteError: any) {
                  console.error(`[Delete] Error during fetch/delete batch for ${sender.email}:`, fetchOrDeleteError);
                  // Decide how to handle batch errors: stop all, skip sender, or just log?
                  // For now, let's stop the whole process on a batch error.
                  errorMessage = `Failed during batch operation for ${sender.email}: ${fetchOrDeleteError.message || 'Unknown error'}`;
                  endType = 'runtime_error';
                  toast.error('Deletion error', { description: errorMessage });
                  senderProcessedSuccessfully = false; // Mark sender as failed
                  break; // Exit batch loop
              }

              // Safety break to prevent accidental infinite loops
              if (batchFetchAttempts > MAX_FETCH_ATTEMPTS) {
                  console.warn(`[Delete] Reached max fetch attempts (${MAX_FETCH_ATTEMPTS}) for ${sender.email}. Stopping.`);
                   errorMessage = `Reached maximum processing attempts for ${sender.email}.`;
                   endType = 'runtime_error';
                  break;
              }

            } while (nextPageToken && endType === 'success'); // Continue batches if there's a next page and no errors/cancellation

            // --- Mark action taken for this sender IF successful ---
            if (senderProcessedSuccessfully && endType !== 'user_stopped') {
              try {
                await markSenderActionTaken(sender.email, 'delete');
              } catch (markError) {
                console.error(`[Delete] Failed to mark action taken for ${sender.email}:`, markError);
                // Decide if this is critical enough to stop the whole process? 
                // For now, just log it and continue with other senders.
              }
            }
            // ---------------------------------------------------------

            // If an error occurred in the inner loop, break the outer loop too
            if (endType !== 'success' && endType !== 'user_stopped') {
                break;
            }
          } // End of sender loop

          // --- 5. Finalization ---
          console.log(`\n[Delete] Deletion process finished. End type: ${endType}`);
          console.log(`[Delete] Total emails successfully deleted: ${totalSuccessfullyDeleted}`);

          // Update Supabase log
          await completeActionLog(
            supabaseLogId!,
            endType,
            totalSuccessfullyDeleted,
            errorMessage // Add error message if it failed
          );

          // Update local storage log
          completeAnalysis(endType, errorMessage);

          // Final UI update
          updateProgress({
            status: endType === 'success' ? 'completed' : (endType === 'user_stopped' ? 'cancelled' : 'error'),
            progressPercent: endType === 'success' ? 100 : progress.progressPercent, // Keep progress if stopped/errored
            emailsDeletedSoFar: totalSuccessfullyDeleted,
            error: errorMessage,
            currentSender: undefined,
          });

          if (endType === 'success') {
            toast.success('Deletion Complete', {
                description: `Successfully deleted ${totalSuccessfullyDeleted.toLocaleString()} emails from ${senders.length} sender(s).`
            });
          } else if (endType === 'user_stopped') {
            toast.info('Deletion Cancelled', {
                description: `Deletion stopped after ${totalSuccessfullyDeleted.toLocaleString()} emails.`
            });
          }
          // Errors were already toasted inside the loop catch block

        } catch (processError: any) {
            // Catch errors from the main async block (e.g., initial setup, final logging)
            console.error('[Delete] Critical error during deletion process:', processError);
            errorMessage = `An unexpected error occurred: ${processError.message || 'Unknown error'}`;
            endType = 'runtime_error';

             // Try to log the failure if we have an ID
            if (supabaseLogId) {
                try {
                    await completeActionLog(supabaseLogId, endType, totalSuccessfullyDeleted, errorMessage);
                    completeAnalysis(endType, errorMessage);
                } catch (logError) {
                    console.error("[Delete] Failed to log critical error:", logError);
                }
            }

            updateProgress({
                status: 'error',
                error: errorMessage,
                currentSender: undefined,
            });
            toast.error('Deletion Failed', { description: errorMessage });
        } finally {
            // Clear the action log ID ref regardless of outcome
            actionLogIdRef.current = null;
        }
      })(); // Immediately invoke the background async function

      // Return success immediately, indicating the process *started*
      return { success: true };
    },
    // --- Dependencies for useCallback ---
    [
      user?.id,
      tokenStatus, // Include full tokenStatus object as its properties are used
      updateProgress,
      getAccessToken,
      requestPermissions,
      isClientLoaded
    ]
  );

  // Return the state and functions needed by the UI
  return {
    progress,
    startDelete,
    cancelDelete,
    reauthModal,
    closeReauthModal,
  };
} 