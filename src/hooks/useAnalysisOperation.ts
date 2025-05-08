import { useState, useCallback, ReactNode } from 'react';
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
import { useUser } from '@supabase/auth-helpers-react';
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
  query: string;
  effectiveEmailCount: number;
}

// Helper to dispatch status change event
function dispatchStatusChange() {
  console.log('[Analysis] Dispatching status change event');
  window.dispatchEvent(new Event('mailmop:analysis-status-change'));
}

// Simple sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useAnalysisOperations() {
  const [progress, setProgress] = useState<AnalysisProgress>({
    status: 'idle',
    progress: 0
  });

  const updateProgress = useCallback((newProgress: AnalysisProgress | ((prev: AnalysisProgress) => AnalysisProgress)) => {
    setProgress(prevProgress => {
      const nextProgress = typeof newProgress === 'function' 
        ? newProgress(prevProgress) 
        : newProgress;
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
  const user = useUser();

  const closeReauthModal = useCallback(() => {
    console.log('[Analysis] Closing reauth modal');
    setReauthModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const startAnalysis = useCallback(async (options: AnalysisOptions) => {
    updateProgress({ status: 'preparing', progress: 0 });
    console.log('[Analysis] Preparing analysis...');

    // 1. Check basic Gmail connection (refresh token presence)
    if (!isGmailConnected) {
      console.log('[Analysis] No Gmail connection (no refresh token), requesting reauth via modal.');
      setReauthModal({ isOpen: true, type: 'expired' });
      updateProgress({ status: 'error', error: 'Gmail not connected. Please reconnect.', progress: 0 });
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
      return { success: false };
    }

    // 3. Pre-flight checks (User, Stats)
    if (!stats?.totalEmails) {
      updateProgress({ status: 'error', error: 'Unable to determine inbox size. Please try again.', progress: 0 });
      return { success: false };
    }
    if (!user?.id) {
      updateProgress({ status: 'error', error: 'User not authenticated.', progress: 0 });
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
    const formattedEta = formatDuration(estimatedRuntimeMs);
    console.log(`[Analysis] Estimated runtime: ${formattedEta}`);
    updateProgress(prev => ({ ...prev, eta: formattedEta }));

    // Removed pre-operation token expiry checks as getAccessToken handles this implicitly.
    // If token is > 55 mins, a toast warning is still fine.
    if (estimatedRuntimeMs > (55 * 60 * 1000)) { // 55 minutes
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
      filters: { query, mode: options.type }
    });

    let supabaseLogId: string;
    try {
      const actionLog = await createActionLog({
        user_id: user.id,
        type: 'analysis',
        status: 'started',
        filters: { type: options.type, query, effectiveEmailCount } as AnalysisFilters,
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

    console.log('[Analysis] Pre-flight checks passed, proceeding with background analysis');
    
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
              if (new Date(sender.date) > new Date(existing.lastDate)) existing.lastDate = sender.date;
              existing.hasUnsubscribe = existing.hasUnsubscribe || sender.hasUnsubscribe;
              if (sender.unsubscribe) existing.unsubscribe = { ...existing.unsubscribe, ...sender.unsubscribe };
            } else {
              senderMap.set(sender.email, {
                senderEmail: sender.email,
                senderName: sender.name,
                count: 1,
                unread_count: sender.isUnread ? 1 : 0,
                lastDate: sender.date,
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
          batchIndex++;

        } while (nextPageToken && progress.status !== 'cancelled');

        if (progress.status === 'cancelled') {
           console.log('[Analysis] Analysis was cancelled by the user.');
           await completeActionLog(supabaseLogId, 'user_stopped', totalProcessed);
           completeAnalysis('user_stopped');
           updateProgress({ status: 'cancelled', progress: progress.progress }); // Keep current progress on cancel
        } else {
          console.log('\n[Analysis] Analysis successfully completed!');
          await completeActionLog(supabaseLogId, 'success', totalProcessed);
          completeAnalysis('success');
          updateProgress({ status: 'completed', progress: 100 });
        }

      } catch (error) {
        console.error('[Analysis] Critical error during background batch processing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Analysis failed during batch processing';
        
        await completeActionLog(supabaseLogId, 'runtime_error', totalProcessed, errorMessage);
        completeAnalysis('runtime_error', errorMessage);
        updateProgress({ status: 'error', progress: totalProcessed > 0 ? progress.progress : 0, error: errorMessage });
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
    updateProgress
  ]);

  const cancelAnalysis = useCallback(async () => {
    // Update status to cancelled. The batch loop will check progress.status.
    updateProgress(prev => ({ ...prev, status: 'cancelled' }));
    setReauthModal({ isOpen: false, type: 'expired' }); // Close reauth modal if open
    // Logging of cancellation will be handled in the batch loop when it terminates.
    console.log('[Analysis] Cancellation signal sent.');
  }, [updateProgress]);

  return {
    progress,
    startAnalysis,
    cancelAnalysis,
    reauthModal,
    closeReauthModal
  };
} 