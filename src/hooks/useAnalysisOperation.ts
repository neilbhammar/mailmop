import { useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  clearSenderAnalysis, 
  storeSenderResults,
  hasSenderAnalysis,
  getDB 
} from '@/lib/storage/senderAnalysis';
import { buildQuery } from '@/lib/gmail/buildQuery';
import { SenderResult, GmailPermissionState, TokenStatus, TokenRunStatus } from '@/types/gmail';
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
const FIFTY_FIVE_MINUTES_MS = 55 * 60 * 1000;
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
  tokenStatus: TokenStatus;
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
  
  // Use setTimeout to ensure the event is dispatched after state updates
  setTimeout(() => {
    window.dispatchEvent(new Event('mailmop:analysis-status-change'));
  }, 0);
}

// Simple sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useAnalysisOperations() {
  const [progress, setProgress] = useState<AnalysisProgress>({
    status: 'idle',
    progress: 0
  });

  // Wrap setProgress to also dispatch status change event
  const updateProgress = useCallback((newProgress: AnalysisProgress | ((prev: AnalysisProgress) => AnalysisProgress)) => {
    setProgress(prevProgress => {
      // Calculate the new state
      const nextProgress = typeof newProgress === 'function' 
        ? newProgress(prevProgress) 
        : newProgress;
      
      // Only dispatch event if status changed
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

  const { tokenStatus, getAccessToken } = useGmailPermissions();
  const { stats } = useGmailStats();
  const user = useUser();

  const closeReauthModal = useCallback(() => {
    console.log('[Analysis] Closing reauth modal');
    setReauthModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const startAnalysis = useCallback(async (options: AnalysisOptions) => {
    try {
      // 1. Update status to preparing (pre-flight phase)
      updateProgress({ status: 'preparing', progress: 0 });
      console.log('[Analysis] Preparing analysis...');

      // 2. Initial token validity check (before any estimation)
      if (tokenStatus.state === 'expired') {
        console.log('[Analysis] Token expired, requesting reauth');
        setReauthModal({
          isOpen: true,
          type: 'expired'
        });
        return { success: false };
      }

      // 3. Pre-flight checks
      if (!stats?.totalEmails) {
        throw new Error('Unable to determine inbox size. Please try again.');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Calculate effective email count for this analysis
      const effectiveEmailCount = getEffectiveEmailCount(
        stats.totalEmails,
        options.type,
        'analysis'
      );

      console.log(`[Analysis] Processing ${effectiveEmailCount.toLocaleString()} out of ${stats.totalEmails.toLocaleString()} total emails`);

      // 4. Calculate estimated runtime
      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'analysis' as OperationType,
        emailCount: stats.totalEmails,
        mode: options.type as OperationMode
      });

      const formattedEta = formatDuration(estimatedRuntimeMs);
      console.log(`[Analysis] Estimated runtime: ${formattedEta}`);
      updateProgress(prev => ({ ...prev, eta: formattedEta }));

      // 5. Check token expiration against operation duration
      if (estimatedRuntimeMs < FIFTY_FIVE_MINUTES_MS) {
        console.log('[Analysis] Validating token duration...');
        if (tokenStatus.timeRemaining < estimatedRuntimeMs) {
          console.log('[Analysis] Token will expire during operation, requesting reauth');
          setReauthModal({
            isOpen: true,
            type: 'will_expire_during_operation',
            eta: formattedEta
          });
          return { success: false };
        }
      } else {
        toast.warning(
          "Long Operation Detected",
          {
            description: `This will take ${formattedEta}. You may need to re-authenticate after an hour. We'll let you know when needed.`,
            duration: 6000
          }
        );
      }

      // 6. Clear existing analysis data before starting new one
      const hasExisting = await hasSenderAnalysis();
      if (hasExisting) {
        console.log('[Analysis] Clearing previous analysis data...');
        await clearSenderAnalysis();
        clearCurrentAnalysis();
      }

      // 7. Initialize/check IndexedDB
      console.log('[Analysis] Initializing IndexedDB...');
      await getDB();

      // 8. Build Gmail query using our utility
      const query = buildQuery({ 
        type: 'analysis', 
        mode: options.type 
      });
      console.log(`[Analysis] Using query: ${query}`);

      // 9. Generate client_action_id and start logging
      const clientActionId = uuidv4();
      const analysisId = new Date().toISOString();

      // Calculate batch estimates
      const emailsPerBatch = BATCH_SIZE;
      const totalEstimatedBatches = Math.ceil(effectiveEmailCount / emailsPerBatch);

      // Create localStorage log with estimates
      createLocalActionLog({
        clientActionId,
        type: options.type,
        estimatedRuntimeMs,
        totalEmails: effectiveEmailCount,
        totalEstimatedBatches,
        query
      });

      // Create Supabase log with estimates
      const actionLog = await createActionLog({
        user_id: user.id,
        type: 'analysis',
        status: 'started',
        filters: {
          type: options.type,
          query,
          effectiveEmailCount
        } as AnalysisFilters,
        estimated_emails: effectiveEmailCount
      });

      // Update localStorage with Supabase ID
      updateAnalysisId(actionLog.id!);

      // 10. Update status to analyzing (active operation phase)
      updateProgress({ status: 'analyzing', progress: 0 });
      await updateActionLog(actionLog.id!, { status: 'analyzing' });

      // All pre-flight checks passed and setup complete
      // Return success now so UI can proceed
      console.log('[Analysis] Pre-flight checks passed, proceeding with analysis');
      
      // Start the batch processing in the background
      (async () => {
        try {
          // 11. Initialize batch processing state
          let nextPageToken: string | undefined;
          let batchIndex = 0;
          let totalProcessed = 0;
          const senderMap = new Map<string, SenderResult>();

          // 12. Start batch processing loop
          do {
            // Add delay between batches to avoid hitting rate limits
            if (batchIndex > 0) {
              console.log(`[Analysis] Adding ${BATCH_DELAY_MS}ms delay between batches...`);
              await sleep(BATCH_DELAY_MS);
            }
            
            const batchNumber = batchIndex + 1;
            console.log(`\n[Analysis] Starting Batch ${batchNumber}`);

            // Check token expiration before each batch
            console.log(`[Analysis] Checking token for batch ${batchNumber}...`);
            if (tokenStatus.timeRemaining < TWO_MINUTES_MS) {
              console.warn('[Analysis] Token expiring soon, pausing for reauth');
              setReauthModal({
                isOpen: true,
                type: 'will_expire_during_operation',
                eta: formatDuration(estimatedRuntimeMs - (totalProcessed / stats.totalEmails) * estimatedRuntimeMs)
              });
              return;
            }

            // Fetch message IDs for this batch
            console.log(`[Analysis] Fetching IDs for batch ${batchNumber}...`);
            const accessToken = await getAccessToken();
            const { messageIds, nextPageToken: newPageToken } = await fetchMessageIds(
              accessToken,
              query,
              nextPageToken
            );

            // Update nextPageToken for next iteration
            nextPageToken = newPageToken;

            if (messageIds.length > 0) {
              console.log(`[Analysis] Fetching metadata for batch ${batchNumber} (${messageIds.length} messages)...`);
              // Fetch metadata for messages
              const metadata = await fetchMetadata(accessToken, messageIds);
              
              console.log(`[Analysis] Parsing headers for batch ${batchNumber}...`);
              // Parse headers into sender information
              const parsedSenders = parseMetadataBatch(metadata);

              console.log(`[Analysis] Aggregating sender stats for batch ${batchNumber}...`);
              // Aggregate sender statistics
              for (const sender of parsedSenders) {
                const existing = senderMap.get(sender.email);
                if (existing) {
                  // Update existing sender stats
                  existing.count++;
                  if (new Date(sender.date) > new Date(existing.lastDate)) {
                    existing.lastDate = sender.date;
                  }
                  existing.hasUnsubscribe = existing.hasUnsubscribe || sender.hasUnsubscribe;
                  if (sender.unsubscribe) {
                    existing.unsubscribe = { ...existing.unsubscribe, ...sender.unsubscribe };
                  }
                } else {
                  // Add new sender
                  senderMap.set(sender.email, {
                    senderEmail: sender.email,
                    senderName: sender.name,
                    count: 1,
                    lastDate: sender.date,
                    analysisId,
                    hasUnsubscribe: sender.hasUnsubscribe,
                    unsubscribe: sender.unsubscribe
                  });
                }
              }

              console.log(`[Analysis] Storing results for batch ${batchNumber}...`);
              // Store current results
              await storeSenderResults(Array.from(senderMap.values()));

              // Update progress based on effective email count
              totalProcessed += messageIds.length;
              const progressPercent = Math.min(100, Math.round((totalProcessed / effectiveEmailCount) * 100));
              
              console.log(`[Analysis] Batch ${batchNumber} complete. Progress: ${progressPercent}% (${totalProcessed.toLocaleString()}/${effectiveEmailCount.toLocaleString()} emails)`);
              
              updateProgress(prev => ({ 
                ...prev,
                progress: progressPercent
              }));

              // Update localStorage progress only during batches
              updateAnalysisProgress(
                batchIndex,
                totalProcessed
              );

              batchIndex++;
            }

          } while (nextPageToken && progress.status !== 'cancelled');

          console.log('\n[Analysis] Analysis complete!');

          // Complete with success - ensure localStorage is updated BEFORE state
          await completeActionLog(actionLog.id!, 'success', totalProcessed);
          completeAnalysis('success');
          
          // Now update progress state and trigger UI updates
          updateProgress({ status: 'completed', progress: 100 });

          // Force an additional dispatch with delay to ensure UI components update
          setTimeout(() => {
            dispatchStatusChange();
          }, 100);

        } catch (error) {
          console.error('[Analysis] Batch processing failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Analysis failed during batch processing';
          
          // For errors, update localStorage first, then progress state
          await completeActionLog(
            actionLog.id!,
            'runtime_error',
            0,
            errorMessage
          );
          completeAnalysis('runtime_error', errorMessage);

          updateProgress({ 
            status: 'error', 
            progress: 0,
            error: errorMessage
          });
          
          // Force an additional dispatch for reliability
          setTimeout(() => {
            dispatchStatusChange();
          }, 100);
        }
      })();

      return { success: true };

    } catch (error) {
      console.error('[Analysis] Pre-flight checks failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed during pre-flight checks';
      
      updateProgress({ 
        status: 'error', 
        progress: 0,
        error: errorMessage
      });
      
      // Force an additional dispatch for reliability
      setTimeout(() => {
        dispatchStatusChange();
      }, 100);

      return { success: false };
    }
  }, [stats?.totalEmails, tokenStatus.state, tokenStatus.timeRemaining, user?.id, getAccessToken, updateProgress]);

  const cancelAnalysis = useCallback(async () => {
    const current = getCurrentAnalysis();
    if (current?.analysis_id) {
      await completeActionLog(
        current.analysis_id,
        'user_stopped',
        current.processed_email_count
      );
      completeAnalysis('user_stopped', 'User cancelled the analysis');
    }

    updateProgress({ status: 'cancelled', progress: 0 });
    setReauthModal({ isOpen: false, type: 'expired' });
    
    // Force a status change event
    setTimeout(() => {
      dispatchStatusChange();
    }, 100);
  }, [updateProgress]);

  return {
    progress,
    startAnalysis,
    cancelAnalysis,
    reauthModal,
    closeReauthModal
  };
} 