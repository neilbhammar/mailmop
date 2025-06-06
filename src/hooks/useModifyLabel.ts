/**
 * useModifyLabel.ts
 * 
 * Hook for modifying labels on emails, either for a single sender or in bulk.
 * Supports both adding and removing labels.
 * Includes queue integration for centralized task management.
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
import { logger } from '@/lib/utils/logger';

// --- Types ---
import { ActionEndType } from '@/types/actions';
import { ModifyLabelJobPayload, ExecutorResult, ProgressCallback } from '@/types/queue';

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
  
  // --- Queue Integration (Critical Pattern) ---
  // Refs to avoid React closure issues in long-running async functions
  const cancellationRef = useRef<boolean>(false);
  const progressRef = useRef<ModifyLabelProgress>({
    status: 'idle',
    progressPercent: 0,
    totalToProcess: 0,
    processedSoFar: 0,
  });

  // Update progress ref when progress state changes
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  /**
   * Updates the progress state
   */
  const updateProgress = useCallback(
    (newProgress: Partial<ModifyLabelProgress>) => {
      setProgress((prev) => ({ ...prev, ...newProgress }));
    },
    []
  );

  /**
   * Cancels an ongoing label modification process
   */
  const cancelModifyLabel = useCallback(async () => {
    logger.debug('Cancellation requested', { component: 'useModifyLabel' });
    isCancelledRef.current = true;
    cancellationRef.current = true;
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
        logger.debug('Logged cancellation', { component: 'useModifyLabel' });
      } catch (error) {
        logger.error('Failed to log cancellation', { component: 'useModifyLabel', error });
      } finally {
        actionLogIdRef.current = null;
      }
    }
  }, [progress.processedSoFar, updateProgress]);

  /**
   * Closes the re-authentication modal
   */
  const closeReauthModal = useCallback(() => {
    logger.debug('Closing reauth modal', { component: 'useModifyLabel' });
    setReauthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Starts the process of modifying labels
   */
  const startModifyLabel = useCallback(
    async (
      options: ModifyLabelOptions, 
      queueProgressCallback?: ProgressCallback,
      abortSignal?: AbortSignal
    ): Promise<{ success: boolean }> => {
      logger.debug('Starting label modification', { 
        component: 'useModifyLabel', 
        senderCount: options.senders.length,
        labelCount: options.labelIds.length,
        actionType: options.actionType
      });
      isCancelledRef.current = false;
      cancellationRef.current = false;

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
        logger.error('Gmail API client is not loaded yet', { component: 'useModifyLabel' });
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

      // --- Queue Progress Integration ---
      if (queueProgressCallback) {
        queueProgressCallback(0, totalToProcess);
      }

      // --- Token & Permission Checks (New Strategy) ---
      if (!isGmailConnected) {
        logger.debug('No Gmail connection (no refresh token), showing reauth modal', { 
          component: 'useModifyLabel' 
        });
        setReauthModal({ isOpen: true, type: 'expired', eta: formattedEta });
        updateProgress({ status: 'error', error: 'Gmail not connected. Please reconnect.' });
        return { success: false };
      }

      try {
        await getAccessToken(); // Verify refresh token validity and get initial access token
        logger.debug('Initial access token validated/acquired', { 
          component: 'useModifyLabel' 
        });
      } catch (error) {
        logger.error('Failed to validate/acquire initial token', { 
          component: 'useModifyLabel', 
          error 
        });
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
            senderCount: options.senders.length,
            labelCount: options.labelIds.length,
            actionType: options.actionType,
            estimatedCount: totalToProcess
          },
          estimated_emails: totalToProcess,
        });
        supabaseLogId = actionLog.id;
        actionLogIdRef.current = supabaseLogId ?? null;
        updateSupabaseLogId(supabaseLogId!);
      } catch (error) {
        logger.error('Failed to create action log', { component: 'useModifyLabel', error });
        toast.error('Failed to start label modification.');
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        clearCurrentActionLog();
        return { success: false };
      }

      // --- Execution Phase ---
      updateProgress({ status: 'marking', progressPercent: 0 });
      await updateActionLog(supabaseLogId!, { status: 'marking' });

      // ✅ FIXED: Actually await the modification process instead of running in background
      let totalProcessed = 0;
      let errorMessage: string | undefined;
      let endType: ActionEndType = 'success';
      let currentAccessToken: string; // To store the token for the current batch

      try {
        for (const sender of options.senders) {
          // Check both cancellation sources (critical pattern from analysis)
          if (isCancelledRef.current || cancellationRef.current || abortSignal?.aborted) {
            logger.debug('Cancellation detected before processing sender', { 
              component: 'useModifyLabel', 
              senderEmail: sender.email 
            });
            endType = 'user_stopped';
            break;
          }

          logger.debug('Processing sender', { 
            component: 'useModifyLabel', 
            senderEmail: sender.email 
          });
          updateProgress({ currentSender: sender.email });

          // Build query to get messages from this sender
          const query = buildQuery({ 
            type: 'mark',
            mode: 'read',
            senderEmail: sender.email,
            additionalTerms: []
          });
          logger.debug('Using query', { component: 'useModifyLabel', query });

          let nextPageToken: string | undefined = undefined;
          let batchFetchAttempts = 0;
          const MAX_FETCH_ATTEMPTS = 30;

          do {
            // Check both cancellation sources (critical pattern from analysis)
            if (isCancelledRef.current || cancellationRef.current || abortSignal?.aborted) {
              logger.debug('Cancellation detected during batch processing', { 
                component: 'useModifyLabel' 
              });
              endType = 'user_stopped';
              break;
            }

            // --- Token Check & Acquisition before batch (New Strategy) ---
            const tokenDetails = peekAccessToken();
            const timeRemaining = tokenTimeRemaining();
            try {
              if (tokenDetails && timeRemaining < TWO_MINUTES_MS) {
                logger.warn('Token expiring soon, forcing refresh', { 
                  component: 'useModifyLabel', 
                  timeRemaining: formatDuration(timeRemaining) 
                });
                currentAccessToken = await forceRefreshAccessToken();
              } else {
                currentAccessToken = await getAccessToken(); // Gets from memory or refreshes if expired
              }
              logger.debug('Token acquired for batch processing sender', { 
                component: 'useModifyLabel', 
                senderEmail: sender.email 
              });
            } catch (tokenError: any) {
              logger.error('Token acquisition failed for batch processing', { 
                component: 'useModifyLabel', 
                senderEmail: sender.email, 
                error: tokenError 
              });
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
            logger.debug('Fetching message IDs batch', { 
              component: 'useModifyLabel', 
              attempt: batchFetchAttempts 
            });

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
                logger.debug('No more messages found', { component: 'useModifyLabel' });
                break;
              }

              logger.debug('Found messages, modifying labels', { 
                component: 'useModifyLabel', 
                messageCount: messageIds.length 
              });

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
                logger.warn('Some batches failed', { 
                  component: 'useModifyLabel', 
                  failedBatches 
                });
              }
              
              totalProcessed += messageIds.length;
              const overallProgress = totalToProcess > 0
                ? Math.min(100, Math.round((totalProcessed / totalToProcess) * 100))
                : (nextPageToken ? 50 : 100);

              logger.debug('Batch successful', { 
                component: 'useModifyLabel', 
                totalProcessed 
              });
              updateProgress({
                processedSoFar: totalProcessed,
                progressPercent: overallProgress,
              });

              // --- Queue Progress Integration ---
              if (queueProgressCallback) {
                queueProgressCallback(totalProcessed, totalToProcess);
              }

              if (BATCH_DELAY_MS > 0 && nextPageToken) {
                await sleep(BATCH_DELAY_MS);
              }

            } catch (error: any) {
              logger.error('Error during batch', { component: 'useModifyLabel', error });
              errorMessage = `Failed during batch operation: ${error.message || 'Unknown error'}`;
              toast.error('Error modifying labels', { description: errorMessage });
              endType = 'runtime_error';
              break;
            }

            if (batchFetchAttempts > MAX_FETCH_ATTEMPTS) {
              logger.warn('Reached max fetch attempts', { component: 'useModifyLabel' });
              errorMessage = `Reached maximum processing attempts.`;
              endType = 'runtime_error';
              break;
            }

          } while (nextPageToken && endType === 'success');
          
          if (endType !== 'success') break;
        }

        // --- Finalization ---
        logger.debug('Process finished', { component: 'useModifyLabel' });
        logger.debug('Total emails processed', { component: 'useModifyLabel', totalProcessed });

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

        return { success: endType === 'success' };

      } catch (error: any) {
        logger.error('Critical error', { component: 'useModifyLabel', error });
        errorMessage = `An unexpected error occurred: ${error.message || 'Unknown error'}`;
        endType = 'runtime_error';

        if (supabaseLogId) {
          try {
            await completeActionLog(supabaseLogId, endType, totalProcessed, errorMessage);
            completeLocalActionLog(endType, errorMessage);
          } catch (logError) {
            logger.error('Failed to log critical error', { component: 'useModifyLabel', error: logError });
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
      tokenTimeRemaining
    ]
  );

  // --- Queue Integration (Wrap Pattern) ---
  const queueExecutor = useCallback(async (
    payload: ModifyLabelJobPayload,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ): Promise<ExecutorResult> => {
    logger.debug('Queue executor called with payload', { component: 'useModifyLabel', payload });
    
    // Convert queue payload to hook format
    const options: ModifyLabelOptions = {
      senders: payload.senders.map(s => ({ email: s.email, emailCount: s.emailCount })),
      labelIds: payload.labelIds,
      actionType: payload.actionType
    };
    
    // Set up cancellation handling
    const handleAbort = () => {
      logger.debug('Queue abort signal received', { component: 'useModifyLabel' });
      cancelModifyLabel();
    };
    abortSignal.addEventListener('abort', handleAbort);
    
    try {
      // Call existing function with queue progress callback
      const result = await startModifyLabel(options, onProgress, abortSignal);
      
      // Determine processedCount and error from final progress state
      let processedCount = progressRef.current.processedSoFar;
      let errorMessage: string | undefined;
      
      if (progressRef.current.status === 'cancelled') {
        errorMessage = 'Operation cancelled by user';
      } else if (progressRef.current.error) {
        errorMessage = progressRef.current.error;
      }
      
      return {
        success: result.success && !errorMessage,
        processedCount,
        error: errorMessage
      };
    } finally {
      abortSignal.removeEventListener('abort', handleAbort);
    }
  }, [startModifyLabel, cancelModifyLabel]);
  
  // Register queue executor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__queueRegisterExecutor?.('modifyLabel', queueExecutor);
    }
  }, [queueExecutor]);

  return {
    progress,
    startModifyLabel,
    cancelModifyLabel,
    reauthModal,
    closeReauthModal,
  };
}