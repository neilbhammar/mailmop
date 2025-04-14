import { useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  clearSenderAnalysis, 
  storeSenderResults,
  hasSenderAnalysis,
  getDB 
} from '@/lib/storage/senderAnalysis';
import { SenderResult } from '@/types/gmail';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useGmailStats } from '@/hooks/useGmailStats';
import { estimateRuntimeMs, formatDuration, OperationType, OperationMode } from '@/lib/utils/estimateRuntime';
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

interface AnalysisProgress {
  status: 'idle' | 'preparing' | 'analyzing' | 'completed' | 'error';
  progress: number;
  error?: string;
  eta?: string;
}

interface AnalysisOptions {
  type: 'full' | 'quick';
}

// Constants
const FIFTY_FIVE_MINUTES_MS = 55 * 60 * 1000;

interface ReauthModalState {
  isOpen: boolean;
  type: 'expired' | 'will_expire_during_operation';
  eta?: string;
}

export function useAnalysisOperations() {
  const [progress, setProgress] = useState<AnalysisProgress>({
    status: 'idle',
    progress: 0
  });

  const [reauthModal, setReauthModal] = useState<ReauthModalState>({
    isOpen: false,
    type: 'expired'
  });

  const { tokenStatus } = useGmailPermissions();
  const { stats } = useGmailStats();
  const user = useUser();

  const closeReauthModal = useCallback(() => {
    setReauthModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const startAnalysis = useCallback(async (options: AnalysisOptions) => {
    try {
      // 1. Update status to preparing
      setProgress({ status: 'preparing', progress: 0 });

      // 2. Initial token validity check (before any estimation)
      if (tokenStatus.state === 'expired') {
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

      // 4. Calculate estimated runtime
      const estimatedRuntimeMs = estimateRuntimeMs({
        operationType: 'analysis' as OperationType,
        emailCount: stats.totalEmails,
        mode: options.type as OperationMode
      });

      const formattedEta = formatDuration(estimatedRuntimeMs);
      setProgress(prev => ({ ...prev, eta: formattedEta }));

      // 5. Check token expiration against operation duration
      if (estimatedRuntimeMs < FIFTY_FIVE_MINUTES_MS) {
        // For shorter operations (<55min), check if token will last
        console.log('Token validation:', {
          timeRemaining: tokenStatus.timeRemaining,
          estimatedRuntime: estimatedRuntimeMs,
          willExpire: tokenStatus.timeRemaining < estimatedRuntimeMs
        });

        if (tokenStatus.timeRemaining < estimatedRuntimeMs) {
          // Token won't last the full operation
          setReauthModal({
            isOpen: true,
            type: 'will_expire_during_operation',
            eta: formattedEta
          });
          return { success: false };
        }
      } else {
        // For long operations (>55min), show warning toast but continue
        toast.warning(
          "Long Operation Detected",
          {
            description: `This is going to take ${formattedEta}. You may need to re-authenticate your email after an hour. We'll let you know when that's needed.`,
            duration: 6000
          }
        );
        // Don't return here - continue with the analysis
      }

      // 6. Build Gmail query
      const query = options.type === 'full' ? '-from:me' : '-from:me unsubscribe';
      console.log(`Starting ${options.type} analysis with query: ${query}`);

      // 7. Generate client_action_id and start logging
      const clientActionId = uuidv4();
      
      // Create localStorage log
      createLocalActionLog({
        clientActionId,
        type: options.type,
        estimatedRuntimeMs,
        totalEmails: stats.totalEmails,
        query
      });

      // Create Supabase log
      const actionLog = await createActionLog({
        user_id: user.id,
        type: 'analysis',
        status: 'started',
        filters: {
          type: options.type,
          query
        }
      });

      // Update localStorage with Supabase ID
      updateAnalysisId(actionLog.id!);

      // 8. Initialize/check database
      await getDB();

      // 9. Clear existing data
      const hasExisting = await hasSenderAnalysis();
      if (hasExisting) {
        await clearSenderAnalysis();
      }

      // 10. Start analysis (for now, just insert dummy data)
      setProgress({ status: 'analyzing', progress: 50 });
      await updateActionLog(actionLog.id!, { status: 'analyzing' });

      const analysisId = new Date().toISOString();
      const dummyData: SenderResult[] = [
        {
          senderEmail: 'newsletter@example.com',
          senderName: 'Daily Newsletter',
          count: 150,
          lastDate: new Date().toISOString(),
          analysisId,
          hasUnsubscribe: true,
          sampleSubjects: ['Your Daily Update', 'Breaking News'],
          messageIds: ['msg1', 'msg2'],
          unsubscribe: {
            url: 'https://example.com/unsubscribe'
          }
        },
        {
          senderEmail: 'marketing@company.com',
          senderName: 'Marketing Team',
          count: 75,
          lastDate: new Date().toISOString(),
          analysisId,
          hasUnsubscribe: true,
          sampleSubjects: ['Special Offer', 'Don\'t Miss Out'],
          messageIds: ['msg3', 'msg4']
        }
      ];

      await storeSenderResults(dummyData);

      // 11. Complete with success
      setProgress({ status: 'completed', progress: 100 });
      await completeActionLog(actionLog.id!, 'success', dummyData.length);
      completeAnalysis('success');

      return { success: true };

    } catch (error) {
      console.error('Analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      
      setProgress({ 
        status: 'error', 
        progress: 0,
        error: errorMessage
      });

      // Update both logs with error status
      const current = getCurrentAnalysis();
      if (current?.analysis_id) {
        await completeActionLog(
          current.analysis_id,
          'runtime_error',
          undefined,
          errorMessage
        );
        completeAnalysis('runtime_error', errorMessage);
      }

      return { success: false };
    }
  }, [stats?.totalEmails, tokenStatus.state, tokenStatus.timeRemaining, user?.id]);

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

    setProgress({ status: 'idle', progress: 0 });
    setReauthModal({ isOpen: false, type: 'expired' });
  }, []);

  return {
    progress,
    startAnalysis,
    cancelAnalysis,
    reauthModal: {
      isOpen: reauthModal.isOpen,
      onOpenChange: closeReauthModal,
      type: reauthModal.type,
      eta: reauthModal.eta
    }
  };
} 