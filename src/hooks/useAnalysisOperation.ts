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
  console.log('[Analysis] Dispatching status change event');
  window.dispatchEvent(new Event('mailmop:analysis-status-change'));
}

// Helper function to send desktop notification
function sendDesktopNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) {
    console.log('[Analysis] Desktop notifications not supported by this browser.');
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
    console.log(`[Analysis] Desktop notification sent: ${title}`);
  } else if (Notification.permission === 'denied') {
    console.log('[Analysis] Desktop notification permission has been denied.');
  } else {
    // 'default' state - permission not yet asked or explicitly denied.
    // The UI should ideally handle requesting permission at an appropriate time.
    console.log('[Analysis] Desktop notification permission not yet granted (is default).');
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
        console.log(`[Analysis] Status changing from ${prevProgress.status} to ${nextProgress.status}`);
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
    console.log('[Analysis] Closing reauth modal');
    setReauthModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const stopSilentAudio = useCallback(() => {
    if (audioRef.current) {
      console.log('[Analysis] Stopping silent audio...');
      audioRef.current.pause();
      // Release the audio file and abort network activity
      audioRef.current.src = ''; 
      audioRef.current.load(); 
      audioRef.current = null;
    }
  }, []);

  const startAnalysis = useCallback(async (options: AnalysisOptions, queueProgressCallback?: ProgressCallback, abortSignal?: AbortSignal) => {
    updateProgress({ status: 'preparing', progress: 0 });
    console.log('[Analysis] Preparing analysis...');

    // 0. Request Notification permission if in 'default' state.
    if ('Notification' in window && Notification.permission === 'default') {
      console.log('[Analysis] Notification permission is default, requesting...');
      try {
        const permissionResult = await Notification.requestPermission();
        console.log(`[Analysis] Notification permission request result: ${permissionResult}`);
        // The sendDesktopNotification function will check the permission status again before sending.
      } catch (error) {
        console.error('[Analysis] Error requesting notification permission:', error);
      }
    }

    // 1. Check basic Gmail connection (refresh token presence)
    if (!isGmailConnected) {
      console.log('[Analysis] No Gmail connection (no refresh token), requesting reauth via modal.');
      setReauthModal({ isOpen: true, type: 'expired' });
      updateProgress({ status: 'error', error: 'Gmail not connected. Please reconnect.', progress: 0 });
      stopSilentAudio(); // Stop audio if it was somehow started
      return { success: false };
    }

    // 2. Try to get a valid access token. This will refresh if necessary.
    // If refresh fails (e.g., refresh token revoked by Google), it will throw.
    try {
      await getAccessToken(); // This ensures we have a working token or throws
      console.log('[Analysis] Access token acquired successfully.');
    } catch (error) {
      console.error('[Analysis] Failed to get initial access token:', error);
      setReauthModal({ isOpen: true, type: 'expired' });
      updateProgress({ status: 'error', error: 'Gmail authentication failed. Please reconnect.', progress: 0 });
      stopSilentAudio();
      return { success: false };
    }

    // 3. Pre-flight checks (User, Stats)
    if (!stats?.totalEmails) {
      updateProgress({ status: 'error', error: 'Unable to determine inbox size. Please try again.', progress: 0 });
      stopSilentAudio();
      return { success: false };
    }
    if (!user?.id) {
      updateProgress({ status: 'error', error: 'User not authenticated.', progress: 0 });
      stopSilentAudio();
      return { success: false };
    }

    const effectiveEmailCount = getEffectiveEmailCount(
      stats.totalEmails,
      options.type,
      'analysis'
    );
    console.log(`[Analysis] Processing ${effectiveEmailCount.toLocaleString()} out of ${stats.totalEmails.toLocaleString()} total emails`);

    const estimatedRuntimeMs = estimateRuntimeMs({
      operationType: 'analysis' as OperationType,
      emailCount: effectiveEmailCount, // Base ETA on effective count
      mode: options.type as OperationMode
    });
    
    // Apply UX polish - minimum time estimates  
    const minimumTimeMs = 30000; // 30 seconds minimum
    const finalEstimatedRuntimeMs = Math.max(minimumTimeMs, estimatedRuntimeMs);
    const formattedEta = formatDuration(finalEstimatedRuntimeMs);
    console.log(`[Analysis] Estimated runtime: ${formattedEta}`);
    updateProgress(prev => ({ ...prev, eta: formattedEta }));

    // Removed pre-operation token expiry checks as getAccessToken handles this implicitly.
    // If token is > 55 mins, a toast warning is still fine.
    if (finalEstimatedRuntimeMs > (55 * 60 * 1000)) { // 55 minutes
      toast.warning(
        "Long Operation Detected",
        {
          description: `This analysis may take around ${formattedEta}. You can leave this page; we'll notify you. If your Gmail session expires (usually after 1 hour of inactivity with Google), you might need to reconnect later.`,
          duration: 8000
        }
      );
    }

    const hasExisting = await hasSenderAnalysis();
    if (hasExisting) {
      console.log('[Analysis] Clearing previous analysis data...');
      await clearSenderAnalysis();
      clearCurrentAnalysis();
    }

    await getDB();
    const query = buildQuery({ type: 'analysis', mode: options.type });
    console.log(`[Analysis] Using query: ${query}`);

    const clientActionId = uuidv4();
    const analysisId = new Date().toISOString();
    const totalEstimatedBatches = Math.ceil(effectiveEmailCount / BATCH_SIZE);

    createLocalActionLog({
      clientActionId,
      type: 'analysis',
      estimatedRuntimeMs,
      totalEmails: effectiveEmailCount,
      totalEstimatedBatches,
      filters: { type: options.type }
    });

    let supabaseLogId: string;
    try {
      const actionLog = await createActionLog({
        user_id: user.id,
        type: 'analysis',
        status: 'started',
        filters: { type: options.type, effectiveEmailCount } as AnalysisFilters,
        estimated_emails: effectiveEmailCount
      });
      supabaseLogId = actionLog.id!;
      updateAnalysisId(supabaseLogId);
    } catch (error) {
      console.error('[Analysis] Failed to create Supabase action log:', error);
      updateProgress({ status: 'error', error: 'Failed to start analysis logging. Please try again.', progress: 0 });
      return { success: false };
    }
    
    updateProgress({ status: 'analyzing', progress: 0 });
    await updateActionLog(supabaseLogId, { status: 'analyzing' });

    // Initial queue progress callback if provided
    if (queueProgressCallback) {
      queueProgressCallback(0, effectiveEmailCount);
    }
    
    // For very small operations, add a small delay to ensure UI can render
    if (effectiveEmailCount <= 100) {
      await sleep(500); // 500ms delay for very small operations
    }

    console.log('[Analysis] Pre-flight checks passed, proceeding with background analysis');
    
    // Start silent audio playback
    if (!audioRef.current) {
      console.log('[Analysis] Creating and playing silent audio for anti-throttling...');
      audioRef.current = new Audio('/sample.mp3'); // Assuming silent.mp3 is in public folder
      audioRef.current.loop = true;
      audioRef.current.volume = .2; // Ensure it's truly silent
      audioRef.current.play().catch(error => {
        console.warn('[Analysis] Silent audio playback failed. This might be due to browser autoplay restrictions or other media issues. Analysis will continue, but background throttling might occur.', error);
        // Don't nullify audioRef.current here, as stopSilentAudio will handle it
      });
    }

    // Request Wake Lock
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[Analysis] Screen Wake Lock Acquired.');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[Analysis] Screen Wake Lock was released externally (e.g., page hidden).');
          // If analysis is still ongoing and wakeLockRef.current exists, it means it was released by the browser.
          // We set it to null so we know we don't hold the lock anymore.
          // Re-acquiring might be an option if the page becomes visible again, but for now, just note it.
          if (wakeLockRef.current) { // Check if it wasn't already released by our code
            wakeLockRef.current = null;
          }
        });
      } catch (err: any) {
        console.error(`[Analysis] Screen Wake Lock API error: ${err.name}, ${err.message}`);
        wakeLockRef.current = null; // Ensure it's null if request failed
      }
    } else if (!('wakeLock' in navigator)) {
      console.log('[Analysis] Screen Wake Lock API not supported by this browser.');
    }
    
    // Start the batch processing in the background
    (async () => {
      let totalProcessed = 0;
      let batchIndex = 0;
      const senderMap = new Map<string, SenderResult>();
      let nextPageToken: string | undefined;
      let currentAccessToken: string;

      try {
        do {
          if (batchIndex > 0) {
            await sleep(BATCH_DELAY_MS);
          }
          
          // 🛑 CRITICAL: Check for cancellation before each batch
          // This prevents the stale closure issue where progress.status doesn't update
          if (cancellationRef.current || (abortSignal && abortSignal.aborted)) {
            console.log(`[Analysis] Cancellation detected before batch ${batchIndex + 1}, stopping analysis`);
            console.log(`[Analysis] Cancellation source: ${cancellationRef.current ? 'cancellationRef' : 'abortSignal'}`);
            break;
          }
          
          const batchNumber = batchIndex + 1;
          console.log(`\n[Analysis] Starting Batch ${batchNumber}`);

          // Get token for the batch, force refresh if current one is about to expire
          const tokenDetails = peekAccessToken();
          const timeRemaining = tokenTimeRemaining();

          try {
            if (tokenDetails && timeRemaining < TWO_MINUTES_MS) {
              console.warn(`[Analysis] Token expiring in ${formatDuration(timeRemaining)}, forcing refresh for batch ${batchNumber}...`);
              currentAccessToken = await forceRefreshAccessToken();
            } else {
              currentAccessToken = await getAccessToken(); // Efficiently gets from memory or refreshes if naturally expired
            }
          } catch (tokenError) {
            console.error(`[Analysis] Token acquisition failed for batch ${batchNumber}:`, tokenError);
            setReauthModal({ isOpen: true, type: 'expired' });
            // This error will be caught by the outer try-catch of this IIFE
            throw new Error('Gmail authentication failed during batch processing.'); 
          }
          
          console.log(`[Analysis] Fetching IDs for batch ${batchNumber}... Access token first 10 chars: ${currentAccessToken.substring(0,10)}`);
          const { messageIds, nextPageToken: newPageTokenResult } = await fetchMessageIds(
            currentAccessToken,
            query,
            nextPageToken,
            BATCH_SIZE // Use BATCH_SIZE for fetching IDs
          );
          nextPageToken = newPageTokenResult;

          if (messageIds.length === 0) {
            console.log(`[Analysis] No more messages to process after batch ${batchNumber - 1}`);
            break;
          }

          console.log(`[Analysis] Fetching metadata for batch ${batchNumber} (${messageIds.length} messages)...`);
          const metadata = await fetchMetadata(currentAccessToken, messageIds);
          
          console.log(`[Analysis] Parsing headers for batch ${batchNumber}...`);
          const parsedSenders = parseMetadataBatch(metadata);

          for (const sender of parsedSenders) {
            const existing = senderMap.get(sender.email);
            if (existing) {
              existing.count++;
              if (sender.isUnread) existing.unread_count++;
              if (!sender.isDateFromFallback && new Date(sender.date) > new Date(existing.lastDate)) {
                existing.lastDate = sender.date;
              }
              existing.hasUnsubscribe = existing.hasUnsubscribe || sender.hasUnsubscribe;
              if (sender.unsubscribe) existing.unsubscribe = { ...existing.unsubscribe, ...sender.unsubscribe };
            } else {
              senderMap.set(sender.email, {
                senderEmail: sender.email,
                senderName: sender.name,
                count: 1,
                unread_count: sender.isUnread ? 1 : 0,
                lastDate: sender.isDateFromFallback ? '' : sender.date,
                analysisId,
                hasUnsubscribe: sender.hasUnsubscribe,
                unsubscribe: sender.unsubscribe
              });
            }
          }

          await storeSenderResults(Array.from(senderMap.values()));
          totalProcessed += messageIds.length;
          const progressPercent = Math.min(100, Math.round((totalProcessed / effectiveEmailCount) * 100));
          
          console.log(`[Analysis] Batch ${batchNumber} complete. Progress: ${progressPercent}% (${totalProcessed.toLocaleString()}/${effectiveEmailCount.toLocaleString()} emails)`);
          updateProgress(prev => ({ ...prev, progress: progressPercent }));
          updateAnalysisProgress(batchIndex, totalProcessed);
          
          // Update queue progress callback if provided
          if (queueProgressCallback) {
            queueProgressCallback(totalProcessed, effectiveEmailCount);
          }
          
          batchIndex++;

        } while (nextPageToken && !cancellationRef.current && !(abortSignal && abortSignal.aborted));

        if (cancellationRef.current || (abortSignal && abortSignal.aborted)) {
           console.log('[Analysis] Analysis was cancelled by the user.');
           await completeActionLog(supabaseLogId, 'user_stopped', totalProcessed);
           completeAnalysis('user_stopped');
           updateProgress({ status: 'cancelled', progress: progress.progress }); // Keep current progress on cancel
           sendDesktopNotification('MailMop: Analysis Cancelled', {
             body: `The analysis was stopped after processing approximately ${totalProcessed.toLocaleString()} emails.`,
           });
        } else {
          console.log('\n[Analysis] Analysis successfully completed!');
          await completeActionLog(supabaseLogId, 'success', totalProcessed);
          completeAnalysis('success');
          updateProgress({ status: 'completed', progress: 100 });
          sendDesktopNotification('MailMop: Analysis Complete!', {
            body: `Successfully processed ${totalProcessed.toLocaleString()} emails. Click to view your results.`,
          });
        }

      } catch (error) {
        console.error('[Analysis] Critical error during background batch processing:', error);
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
            console.log('[Analysis] Screen Wake Lock Released in finally block.');
          } catch (err: any) {
            console.error(`[Analysis] Error releasing Screen Wake Lock: ${err.name}, ${err.message}`);
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
    console.log('[Analysis] Cancellation signal sent.');
    // Stop silent audio on explicit cancellation
    stopSilentAudio();
    // Release Wake Lock on cancellation
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        console.log('[Analysis] Screen Wake Lock Released due to cancellation.');
      } catch (err: any) {
        console.error(`[Analysis] Error releasing Screen Wake Lock on cancellation: ${err.name}, ${err.message}`);
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
    console.log('[Analysis] Queue executor called with payload:', payload);
    
    // Set up cancellation handling
    const handleAbort = () => {
      console.log('[Analysis] Queue cancellation requested via abort event');
      cancelAnalysis();
    };
    
    console.log('[Analysis] Setting up abort signal listener, signal aborted:', abortSignal.aborted);
    abortSignal.addEventListener('abort', handleAbort);
    
    // Also check if already aborted before we set up the listener
    if (abortSignal.aborted) {
      console.log('[Analysis] Abort signal already aborted before listener setup');
      handleAbort();
    }
    
    try {
      // Convert queue payload to hook format
      const options: AnalysisOptions = { type: payload.type };
      
      // Create a custom progress callback that bridges to the queue system
      const bridgeProgressCallback: ProgressCallback = (current, total) => {
        console.log(`[Analysis] Queue progress update: ${current}/${total}`);
        onProgress(current, total);
      };
      
      // Call startAnalysis with our bridge callback and abort signal
      const setupResult = await startAnalysis(options, bridgeProgressCallback, abortSignal);
      
      if (!setupResult.success) {
        // Setup failed, return immediately
        return {
          success: false,
          error: 'Failed to start analysis',
          processedCount: 0
        };
      }
      
      // Setup succeeded, now we need to wait for the actual completion
      // We'll poll the progress state until completion
      console.log('[Analysis] Analysis setup complete, monitoring for completion...');
      
      return new Promise<ExecutorResult>((resolve) => {
        const pollInterval = setInterval(() => {
          // Check for cancellation via abort signal OR cancellation ref
          if (abortSignal.aborted || cancellationRef.current) {
            clearInterval(pollInterval);
            console.log('[Analysis] Queue executor detected cancellation via', abortSignal.aborted ? 'abort signal' : 'cancellation ref');
            resolve({
              success: false,
              error: 'Operation cancelled by user',
              processedCount: progressRef.current.progress
            });
            return;
          }
          
          // Check completion status using current progress state from ref
          const currentProgress = progressRef.current;
          if (currentProgress.status === 'completed') {
            clearInterval(pollInterval);
            console.log('[Analysis] Queue executor detected completion');
            resolve({
              success: true,
              processedCount: currentProgress.progress
            });
          } else if (currentProgress.status === 'error') {
            clearInterval(pollInterval);
            console.log('[Analysis] Queue executor detected error:', currentProgress.error);
            resolve({
              success: false,
              error: currentProgress.error || 'Analysis failed',
              processedCount: currentProgress.progress
            });
          }
          // Continue polling for other statuses (preparing, analyzing)
        }, 500); // Poll every 500ms
      });
      
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
        processedCount: progressRef.current.progress
      };
    } finally {
      abortSignal.removeEventListener('abort', handleAbort);
    }
  }, [startAnalysis, cancelAnalysis]);

  // Register with queue system
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__queueRegisterExecutor) {
      console.log('[Analysis] Registering executor with queue system');
      (window as any).__queueRegisterExecutor('analysis', queueExecutor);
    }
  }, [queueExecutor]);

  return {
    progress,
    startAnalysis,
    cancelAnalysis,
    reauthModal,
    closeReauthModal
  };
} 