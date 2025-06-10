import { useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  clearSenderAnalysis, 
  storeSenderResults,
  hasSenderAnalysis,
  getDB 
} from '@/lib/storage/senderAnalysis';
import { buildQuery } from '@/lib/gmail/buildQuery';
import { SenderResult, GmailPermissionState, TokenStatus as TypesTokenStatus, TokenRunStatus } from '@/types/gmail';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useGmailStats } from '@/hooks/useGmailStats';
import { estimateRuntimeMs, formatDuration, OperationType, OperationMode, getEffectiveEmailCount } from '@/lib/utils/estimateRuntime';
import { toast } from 'sonner';
import { ReauthDialog } from '@/components/modals/ReauthDialog';
import { useAuth } from '@/context/AuthProvider';
import { createActionLog, updateActionLog, completeActionLog } from '@/supabase/actions/logAction';
import { 
  createLocalActionLog, 
  updateAnalysisId, 
  updateAnalysisProgress, 
  completeAnalysis, 
  clearCurrentAnalysis,
  getCurrentAnalysis 
} from '@/lib/storage/actionLog';
import { ActionEndType } from '@/types/actions';
import { fetchMessageIds } from '@/lib/gmail/fetchMessageIds';
import { fetchMetadata } from '@/lib/gmail/fetchMetadata';
import { parseMetadataBatch } from '@/lib/gmail/parseHeaders';
import { logger } from '@/lib/utils/logger';
import { playSuccessMp3 } from '@/lib/utils/sounds';

// --- Queue System Integration ---
import { AnalysisJobPayload, ProgressCallback, ExecutorResult } from '@/types/queue';

// Analysis status types - used for UI state and progress tracking
type AnalysisStatus = 
  | 'idle'        // Initial state
  | 'preparing'   // Pre-flight checks (time estimates, token validation)
  | 'analyzing'   // Active Gmail API operations
  | 'completed'   // Successfully finished
  | 'error'       // Failed with error
  | 'cancelled';  // User stopped operation

interface AnalysisProgress {
  status: AnalysisStatus;
  progress: number;
  error?: string;
  eta?: string;
}

interface AnalysisOptions {
  type: 'full' | 'quick';
}

// Constants
const TWO_MINUTES_MS = 2 * 60 * 1000;
const BATCH_SIZE = 45;
const BATCH_DELAY_MS = 250; // Delay between batches to avoid rate limits

interface ReauthModalState {
  isOpen: boolean;
  type: 'expired' | 'will_expire_during_operation';
  eta?: string;
}

interface GmailPermissionsContextType extends GmailPermissionState {
  isLoading: boolean;
  isClientLoaded: boolean;
  requestPermissions: () => Promise<boolean>;
  shouldShowPermissionsModal: boolean;
  shouldShowMismatchModal: boolean;
  gmailEmail: string | null;
  clearToken: () => void;
  tokenStatus: TypesTokenStatus;
  canTokenSurvive: (durationMs: number) => boolean;
  getTokenRunStatus: (durationMs: number) => TokenRunStatus;
  getAccessToken: () => Promise<string>;
}

// Update the filters type to include effectiveEmailCount
interface AnalysisFilters {
  type: 'full' | 'quick';
  effectiveEmailCount: number;
}

// Helper to dispatch status change event
function dispatchStatusChange() {
  logger.debug('Dispatching status change event', { component: 'analysis' });
  window.dispatchEvent(new Event('mailmop:analysis-status-change'));
}

// Helper function to send desktop notification
function sendDesktopNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) {
    logger.debug('Desktop notifications not supported by this browser', { component: 'analysis' });
    return;
  }
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, { ...options, icon: '/favicon.png' });
    notification.onclick = () => {
      // Focus the window when notification is clicked
      window.focus();
      // Potentially navigate to a relevant page or close notification
      notification.close();
    };
    logger.debug('Desktop notification sent', { component: 'analysis', title });
  } else if (Notification.permission === 'denied') {
    logger.debug('Desktop notification permission has been denied', { component: 'analysis' });
  } else {
    // 'default' state - permission not yet asked or explicitly denied.
    // The UI should ideally handle requesting permission at an appropriate time.
    logger.debug('Desktop notification permission not yet granted (is default)', { component: 'analysis' });
  }
}

// Simple sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useAnalysisOperations() {
  const [progress, setProgress] = useState<AnalysisProgress>({
    status: 'idle',
    progress: 0
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null); // Ref for Wake Lock
  const cancellationRef = useRef<boolean>(false); // Track cancellation state with ref to avoid closure issues
  const progressRef = useRef<AnalysisProgress>({ status: 'idle', progress: 0 }); // Track current progress state

  const updateProgress = useCallback((newProgress: AnalysisProgress | ((prev: AnalysisProgress) => AnalysisProgress)) => {
    setProgress(prevProgress => {
      const nextProgress = typeof newProgress === 'function' 
        ? newProgress(prevProgress) 
        : newProgress;
      
      // Update the ref with the latest progress
      progressRef.current = nextProgress;
      
      // Update cancellation ref when status changes to cancelled
      if (nextProgress.status === 'cancelled') {
        cancellationRef.current = true;
      } else if (nextProgress.status === 'idle' || nextProgress.status === 'preparing') {
        cancellationRef.current = false; // Reset on new analysis
      }
      
      if (prevProgress.status !== nextProgress.status) {
        logger.debug('Status change', { 
          component: 'analysis', 
          from: prevProgress.status, 
          to: nextProgress.status 
        });
        dispatchStatusChange();
      }
      return nextProgress;
    });
  }, []);

  const [reauthModal, setReauthModal] = useState<ReauthModalState>({
    isOpen: false,
    type: 'expired'
  });

  const {
    getAccessToken, 
    forceRefreshAccessToken, 
    peekAccessToken, 
    tokenTimeRemaining,
    hasRefreshToken: isGmailConnected
  } = useGmailPermissions();
  const { stats } = useGmailStats();
  const { user } = useAuth();

  const closeReauthModal = useCallback(() => {
    logger.debug('Closing reauth modal', { component: 'analysis' });
    setReauthModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const stopSilentAudio = useCallback(() => {
    if (audioRef.current) {
      logger.debug('Stopping silent audio', { component: 'analysis' });
      audioRef.current.pause();
      // Release the audio file and abort network activity
      audioRef.current.src = ''; 
      audioRef.current.load(); 
      audioRef.current = null;
    }
  }, []);

  const startAnalysis = useCallback(async (options: AnalysisOptions, queueProgressCallback?: ProgressCallback, abortSignal?: AbortSignal) => {
    updateProgress({ status: 'preparing', progress: 0 });
    logger.debug('Preparing analysis', { component: 'analysis', options });

    // 0. Request Notification permission if in 'default' state.
    if ('Notification' in window && Notification.permission === 'default') {
      logger.debug('Requesting notification permission', { component: 'analysis' });
      try {
        const permissionResult = await Notification.requestPermission();
        logger.debug('Notification permission result', { component: 'analysis', result: permissionResult });
        // The sendDesktopNotification function will check the permission status again before sending.
      } catch (error) {
        logger.error('Error requesting notification permission', { 
          component: 'analysis', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // 1. Check basic Gmail connection (refresh token presence)
    if (!isGmailConnected) {
      logger.debug('No Gmail connection, requesting reauth via modal', { component: 'analysis' });
      setReauthModal({ isOpen: true, type: 'expired' });
      updateProgress({ status: 'error', progress: 0, error: 'Gmail connection required. Please reconnect your account.' });
      return { success: false };
    }

    // 2. Try to get a valid access token. This will refresh if necessary.
    // If refresh fails (e.g., refresh token revoked by Google), it will throw.
    try {
      await getAccessToken(); // This ensures we have a working token or throws
      logger.debug('Access token acquired successfully', { component: 'analysis' });
    } catch (error) {
      logger.error('Failed to get initial access token', { 
        component: 'analysis', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      setReauthModal({ isOpen: true, type: 'expired' });
      updateProgress({ status: 'error', progress: 0, error: 'Gmail authentication failed. Please reconnect your account.' });
      return { success: false };
    }

    if (!stats?.totalEmails) {
      updateProgress({ status: 'error', progress: 0, error: 'No Gmail stats available. Please refresh and try again.' });
      return { success: false };
    }

    if (!user?.id) {
      updateProgress({ status: 'error', progress: 0, error: 'User authentication required. Please sign in again.' });
      return { success: false };
    }

    // 3. Estimate runtime and get effective email count based on analysis type
    const operationType: OperationType = 'analysis';
    const operationMode: OperationMode = options.type === 'quick' ? 'quick' : 'full';
    const effectiveEmailCount = getEffectiveEmailCount(stats.totalEmails, operationMode, operationType);
    const estimatedRuntimeMs = estimateRuntimeMs({
      operationType,
      emailCount: effectiveEmailCount,
      mode: operationMode
    });
    const formattedEta = formatDuration(estimatedRuntimeMs);

    logger.info('Starting analysis', { 
      component: 'analysis',
      totalEmails: stats.totalEmails,
      effectiveEmails: effectiveEmailCount,
      estimatedRuntimeMs,
      formattedEta
    });

    updateProgress(prev => ({ ...prev, eta: formattedEta }));

    // Removed pre-flight checks as getAccessToken handles this implicitly.
    // If token is > 55 mins, a toast warning is still fine.

    // 4. Clear any previous analysis data
    if (await hasSenderAnalysis()) {
      logger.debug('Clearing previous analysis data', { component: 'analysis' });
      await clearSenderAnalysis();
    }

    // 5. Build the Gmail query based on analysis type
    const query = buildQuery({ type: 'analysis', mode: options.type });
    logger.debug('Using query for analysis', { component: 'analysis', query });

    let analysisId = '';
    let supabaseLogId = '';

    // 6. Create action logs
    try {
      // Supabase log
      const result = await createActionLog({
        user_id: user.id,
        type: 'analysis',
        status: 'started',
        filters: {
          analysisType: options.type,
          estimatedDuration: formattedEta,
          totalEmails: stats.totalEmails,
          effectiveEmailCount
        },
        estimated_emails: effectiveEmailCount
      });
      supabaseLogId = result.id!;
      analysisId = result.id!;

      // Local log
      const clientActionId = supabaseLogId;
      await createLocalActionLog({
        clientActionId,
        type: 'analysis',
        estimatedRuntimeMs,
        totalEmails: effectiveEmailCount,
        totalEstimatedBatches: Math.ceil(effectiveEmailCount / BATCH_SIZE),
        filters: {
          analysisType: options.type,
          estimatedDuration: formattedEta,
          totalEmails: stats.totalEmails,
          effectiveEmailCount
        }
      });
      await updateAnalysisId(analysisId);
    } catch (error) {
      logger.error('Failed to create Supabase action log', { 
        component: 'analysis', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Continue without logging - the operation can still proceed
    }

    updateProgress({ status: 'analyzing', progress: 0 });

    // 7. Background processing via async IIFE
    (async () => {
      let totalProcessed = 0;
      let batchIndex = 0;

      try {
        logger.debug('Pre-flight checks passed, proceeding with background analysis', { component: 'analysis' });

        // Create and play silent audio to keep the page active
        try {
          logger.debug('Creating and playing silent audio for anti-throttling', { component: 'analysis' });
          audioRef.current = new Audio('/sample.mp3'); // Path to your silent audio file
          audioRef.current.loop = true;
          audioRef.current.volume = 0.2; // Ensure it's truly silent
          await audioRef.current.play();
        } catch (error) {
          logger.warn('Silent audio playback failed. Analysis will continue, but background throttling might occur', { 
            component: 'analysis', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }

        // Acquire Screen Wake Lock if supported
        try {
          if ('wakeLock' in navigator) {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            logger.debug('Screen Wake Lock Acquired', { component: 'analysis' });
            wakeLockRef.current.addEventListener('release', () => {
              logger.debug('Screen Wake Lock was released externally (e.g., page hidden)', { component: 'analysis' });
            });
          } else {
            logger.debug('Screen Wake Lock API not supported by this browser', { component: 'analysis' });
          }
        } catch (err: any) {
          logger.error('Screen Wake Lock API error', { 
            component: 'analysis', 
            error: `${err.name}, ${err.message}` 
          });
        }

        // Batch processing
        const senderMap = new Map<string, SenderResult>();
        let nextPageToken: string | undefined;
        let currentAccessToken: string;

        do {
          const batchNumber = batchIndex + 1;

          // Check for cancellation before starting each batch
          if (cancellationRef.current || (abortSignal && abortSignal.aborted)) {
            logger.debug('Cancellation detected before batch', { 
              component: 'analysis', 
              batchNumber,
              source: cancellationRef.current ? 'cancellationRef' : 'abortSignal'
            });
            break;
          }

          logger.debug('Starting batch', { component: 'analysis', batchNumber });

          // Get token for the batch, force refresh if current one is about to expire
          const tokenDetails = peekAccessToken();
          const timeRemaining = tokenTimeRemaining();

          try {
            if (tokenDetails && timeRemaining < TWO_MINUTES_MS) {
              logger.warn('Token expiring soon, forcing refresh', { 
                component: 'analysis', 
                batchNumber, 
                timeRemaining: formatDuration(timeRemaining) 
              });
              currentAccessToken = await forceRefreshAccessToken();
            } else {
              currentAccessToken = await getAccessToken(); // Efficiently gets from memory or refreshes if naturally expired
            }
          } catch (tokenError) {
            logger.error('Token acquisition failed for batch', { 
              component: 'analysis', 
              batchNumber, 
              error: tokenError instanceof Error ? tokenError.message : 'Unknown error' 
            });
            setReauthModal({ isOpen: true, type: 'expired' });
            // This error will be caught by the outer try-catch of this IIFE
            throw new Error('Gmail authentication failed during batch processing.'); 
          }
          
          logger.debug('Fetching IDs for batch', { component: 'analysis', batchNumber });
          const { messageIds, nextPageToken: newPageTokenResult } = await fetchMessageIds(
            currentAccessToken,
            query,
            nextPageToken,
            BATCH_SIZE // Use BATCH_SIZE for fetching IDs
          );
          nextPageToken = newPageTokenResult;

          if (messageIds.length === 0) {
            logger.debug('No more messages to process', { component: 'analysis', afterBatch: batchNumber - 1 });
            break;
          }

          logger.debug('Fetching metadata for batch', { component: 'analysis', batchNumber, messageCount: messageIds.length });
          const metadata = await fetchMetadata(currentAccessToken, messageIds);
          
          logger.debug('Parsing headers for batch', { component: 'analysis', batchNumber });
          const parsedSenders = parseMetadataBatch(metadata);

          for (const sender of parsedSenders) {
            const existing = senderMap.get(sender.email);
            if (existing) {
              existing.count++;
              if (sender.isUnread) existing.unread_count++;
              if (!sender.isDateFromFallback && new Date(sender.date) > new Date(existing.lastDate)) {
                existing.lastDate = sender.date;
                // Update to most recent name when date is newer (Option 1: Most Recent Name)
                if (sender.name && sender.name !== existing.senderName) {
                  // Initialize senderNames array if not exists, preserving previous display name
                  if (!existing.senderNames) {
                    existing.senderNames = [existing.senderName];
                  }
                  // Add new name if not already in the list (efficient check)
                  if (!existing.senderNames.includes(sender.name)) {
                    existing.senderNames.push(sender.name);
                  }
                  // Update display name to most recent
                  existing.senderName = sender.name;
                }
              } else if (sender.name && sender.name !== existing.senderName) {
                // Even if date is not newer, track the name variation
                if (!existing.senderNames) {
                  existing.senderNames = [existing.senderName];
                }
                if (!existing.senderNames.includes(sender.name)) {
                  existing.senderNames.push(sender.name);
                }
              }
              existing.hasUnsubscribe = existing.hasUnsubscribe || sender.hasUnsubscribe;
              if (sender.unsubscribe) {
                // Append-only merge: preserve enriched data, merge header data
                existing.unsubscribe = {
                  // Always merge header data (existing logic unchanged)
                  ...existing.unsubscribe,
                  ...sender.unsubscribe,
                  
                  // Preserve enriched data (never overwritten)
                  enrichedUrl: existing.unsubscribe?.enrichedUrl,
                  enrichedAt: existing.unsubscribe?.enrichedAt,
                  
                  // Only set firstMessageId if we don't have one yet (captured during analysis)
                  firstMessageId: existing.unsubscribe?.firstMessageId || sender.messageId,
                };
              }
            } else {
              senderMap.set(sender.email, {
                senderEmail: sender.email,
                senderName: sender.name,
                // No need to initialize senderNames for new senders - only when variations are found
                count: 1,
                unread_count: sender.isUnread ? 1 : 0,
                lastDate: sender.isDateFromFallback ? '' : sender.date,
                analysisId,
                hasUnsubscribe: sender.hasUnsubscribe,
                unsubscribe: sender.unsubscribe ? {
                  ...sender.unsubscribe,
                  firstMessageId: sender.messageId // Capture first message ID for new senders
                } : undefined
              });
            }
          }

          await storeSenderResults(Array.from(senderMap.values()));
          totalProcessed += messageIds.length;
          const progressPercent = Math.min(100, Math.round((totalProcessed / effectiveEmailCount) * 100));
          
          logger.debug('Batch complete', { 
            component: 'analysis', 
            batchNumber, 
            progressPercent, 
            processed: totalProcessed, 
            total: effectiveEmailCount 
          });
          updateProgress(prev => ({ ...prev, progress: progressPercent }));
          updateAnalysisProgress(batchIndex, totalProcessed);
          
          // Update queue progress callback if provided
          if (queueProgressCallback) {
            queueProgressCallback(totalProcessed, effectiveEmailCount);
          }
          
          batchIndex++;

        } while (nextPageToken && !cancellationRef.current && !(abortSignal && abortSignal.aborted));

        if (cancellationRef.current || (abortSignal && abortSignal.aborted)) {
           logger.debug('Analysis was cancelled by the user', { component: 'analysis' });
           await completeActionLog(supabaseLogId, 'user_stopped', totalProcessed);
           completeAnalysis('user_stopped');
           updateProgress({ status: 'cancelled', progress: progress.progress }); // Keep current progress on cancel
           sendDesktopNotification('MailMop: Analysis Cancelled', {
             body: `The analysis was stopped after processing approximately ${totalProcessed.toLocaleString()} emails.`,
           });
        } else {
          logger.info('Analysis successfully completed', { component: 'analysis', totalProcessed });
          await completeActionLog(supabaseLogId, 'success', totalProcessed);
          completeAnalysis('success');
          updateProgress({ status: 'completed', progress: 100 });
          
          // 🎵 Play success sound for successful analysis completion
          playSuccessMp3();
          
          sendDesktopNotification('MailMop: Analysis Complete!', {
            body: `Successfully processed ${totalProcessed.toLocaleString()} emails. Click to view your results.`,
          });
        }

      } catch (error) {
        logger.error('Critical error during background batch processing', { 
          component: 'analysis', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        const errorMessage = error instanceof Error ? error.message : 'Analysis failed during batch processing';
        
        await completeActionLog(supabaseLogId, 'runtime_error', totalProcessed, errorMessage);
        completeAnalysis('runtime_error', errorMessage);
        updateProgress({ status: 'error', progress: totalProcessed > 0 ? progress.progress : 0, error: errorMessage });
        sendDesktopNotification('MailMop: Analysis Error', {
          body: `An error occurred: ${errorMessage}. Please try again or contact support.`,
        });
      } finally {
        // Ensure silent audio is stopped regardless of how the async operation concludes
        stopSilentAudio();
        // Release Wake Lock
        if (wakeLockRef.current) {
          try {
            await wakeLockRef.current.release();
            logger.debug('Screen Wake Lock Released in finally block', { component: 'analysis' });
          } catch (err: any) {
            logger.error('Error releasing Screen Wake Lock', { 
              component: 'analysis', 
              error: `${err.name}, ${err.message}` 
            });
          } finally {
            wakeLockRef.current = null; // Ensure it's null even if release throws
          }
        }
      }
    })();

    return { success: true }; // Indicates pre-flight and setup were successful

  }, [
    user?.id, 
    stats?.totalEmails, 
    getAccessToken, 
    forceRefreshAccessToken, 
    peekAccessToken, 
    tokenTimeRemaining, 
    isGmailConnected,
    updateProgress,
    stopSilentAudio
  ]);

  const cancelAnalysis = useCallback(async () => {
    // Update status to cancelled. The batch loop will check progress.status.
    updateProgress(prev => ({ ...prev, status: 'cancelled' }));
    setReauthModal({ isOpen: false, type: 'expired' }); // Close reauth modal if open
    // Logging of cancellation will be handled in the batch loop when it terminates.
    logger.debug('Cancellation signal sent', { component: 'analysis' });
    // Stop silent audio on explicit cancellation
    stopSilentAudio();
    // Release Wake Lock on cancellation
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        logger.debug('Screen Wake Lock Released due to cancellation', { component: 'analysis' });
      } catch (err: any) {
        logger.error('Error releasing Screen Wake Lock on cancellation', { 
          component: 'analysis', 
          error: `${err.name}, ${err.message}` 
        });
      } finally {
        wakeLockRef.current = null;
      }
    }
  }, [updateProgress, stopSilentAudio]);

  /**
   * 🔌 QUEUE SYSTEM INTEGRATION
   * 
   * This creates a simple adapter function that converts queue payload format
   * to the format expected by startAnalysis, then calls it directly.
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
    payload: AnalysisJobPayload,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ): Promise<ExecutorResult> => {
    logger.debug('Queue executor called', { component: 'analysis', payload });
    
    // Set up cancellation handling
    const handleAbort = () => {
      logger.debug('Queue cancellation requested via abort event', { component: 'analysis' });
      cancelAnalysis();
    };
    
    logger.debug('Setting up abort signal listener', { component: 'analysis', aborted: abortSignal.aborted });
    abortSignal.addEventListener('abort', handleAbort);
    
    // Also check if already aborted before we set up the listener
    if (abortSignal.aborted) {
      logger.debug('Abort signal already aborted before listener setup', { component: 'analysis' });
      handleAbort();
    }
    
    try {
      // Convert queue payload to hook format
      const options: AnalysisOptions = { type: payload.type };
      
      // Create a custom progress callback that bridges to the queue system
      const bridgeProgressCallback: ProgressCallback = (current, total) => {
        logger.debug('Queue progress update', { component: 'analysis', current, total });
        onProgress(current, total);
      };
      
      // Call startAnalysis with our bridge callback and abort signal
      const setupResult = await startAnalysis(options, bridgeProgressCallback, abortSignal);
      
      if (!setupResult.success) {
        // Setup failed, return immediately
        return { success: false, error: 'Analysis setup failed' };
      }
      
      logger.debug('Analysis setup complete, monitoring for completion', { component: 'analysis' });
      
      // Wait for completion by monitoring progress state
      return new Promise<ExecutorResult>((resolve) => {
        const checkStatus = () => {
          const currentProgress = progressRef.current;
          
          if (abortSignal.aborted || cancellationRef.current) {
            logger.debug('Queue executor detected cancellation', { 
              component: 'analysis', 
              via: abortSignal.aborted ? 'abort signal' : 'cancellation ref' 
            });
            resolve({ success: false, error: 'Operation cancelled by user' });
            return;
          }
          
          if (currentProgress.status === 'completed') {
            logger.debug('Queue executor detected completion', { component: 'analysis' });
            resolve({ success: true });
            return;
          }
          
          if (currentProgress.status === 'error') {
            logger.debug('Queue executor detected error', { component: 'analysis', error: currentProgress.error });
            resolve({ success: false, error: currentProgress.error || 'Analysis failed' });
            return;
          }
          
          // Continue monitoring
          setTimeout(checkStatus, 500); // Check every 500ms
        };
        
        checkStatus();
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Queue executor error', { component: 'analysis', error: errorMessage });
      
      return { success: false, error: errorMessage };
    } finally {
      abortSignal.removeEventListener('abort', handleAbort);
    }
  }, [startAnalysis, cancelAnalysis, progressRef]);

  // Register the executor when the hook mounts
  useEffect(() => {
    logger.debug('Registering executor with queue system', { component: 'analysis' });
    
    // Register with the queue system using the proper method
    if (typeof window !== 'undefined' && (window as any).__queueRegisterExecutor) {
      logger.debug('Registering analysis executor with queue', { component: 'analysis' });
      (window as any).__queueRegisterExecutor('analysis', queueExecutor);
    }
  }, [queueExecutor]);

  return {
    progress,
    startAnalysis,
    cancelAnalysis,
    reauthModal,
    closeReauthModal,
    queueExecutor
  };
} 