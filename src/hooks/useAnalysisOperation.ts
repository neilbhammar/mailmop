import { useState, useCallback, ReactNode } from 'react';
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

      // 7. Initialize/check database
      await getDB(); // This will create the DB if it doesn't exist

      // 8. Clear existing data
      const hasExisting = await hasSenderAnalysis();
      if (hasExisting) {
        await clearSenderAnalysis();
      }

      // 9. Start analysis (for now, just insert dummy data)
      setProgress({ status: 'analyzing', progress: 50 });

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

      // 10. Complete
      setProgress({ status: 'completed', progress: 100 });
      return { success: true };

    } catch (error) {
      console.error('Analysis failed:', error);
      setProgress({ 
        status: 'error', 
        progress: 0,
        error: error instanceof Error ? error.message : 'Analysis failed'
      });
      return { success: false };
    }
  }, [stats?.totalEmails, tokenStatus.state, tokenStatus.timeRemaining]);

  const cancelAnalysis = useCallback(async () => {
    // TODO: Implement cancellation logic
    setProgress({ status: 'idle', progress: 0 });
    setReauthModal({ isOpen: false, type: 'expired' });
  }, []);

  // Return the dialog state instead of the component
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