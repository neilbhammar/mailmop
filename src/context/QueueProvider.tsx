'use client'

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, ReactNode, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobType, JobStatus, ProgressCallback, ExecutorResult, JobExecutor } from '@/types/queue';
import { toast } from 'sonner';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { ReauthDialog } from '@/components/modals/ReauthDialog';
import { logger } from '@/lib/utils/logger';
import { storeSenderAction, updateActionStatus } from '@/lib/storage/actionStorage'

// Context types
interface QueueContextType {
  jobs: Job[];
  isProcessing: boolean;
  currentJobId: string | null;
  enqueue: (type: JobType, payload: any) => string;
  cancel: (jobId: string) => void;
  clearCompleted: () => void;
  showReauthDialog: boolean;
  setShowReauthDialog: (show: boolean) => void;
}

// State shape
interface QueueState {
  jobs: Job[];
  isProcessing: boolean;
  currentJobId: string | null;
}

// Action types
type QueueAction = 
  | { type: 'ENQUEUE_JOB'; payload: Job }
  | { type: 'START_JOB'; payload: { id: string } }
  | { type: 'UPDATE_PROGRESS'; payload: { id: string; progress: Job['progress'] } }
  | { type: 'COMPLETE_JOB'; payload: { id: string; status: 'success' | 'error'; error?: string } }
  | { type: 'CANCEL_JOB'; payload: { id: string } }
  | { type: 'CLEAR_COMPLETED' };

// Initial state
const initialState: QueueState = {
  jobs: [],
  isProcessing: false,
  currentJobId: null,
};

// Reducer function
function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'ENQUEUE_JOB':
      return {
        ...state,
        jobs: [...state.jobs, action.payload],
      };

    case 'START_JOB':
      return {
        ...state,
        isProcessing: true,
        currentJobId: action.payload.id,
        jobs: state.jobs.map(job =>
          job.id === action.payload.id
            ? { ...job, status: 'running' as JobStatus, startedAt: Date.now() }
            : job
        ),
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.payload.id
            ? { ...job, progress: action.payload.progress }
            : job
        ),
      };

    case 'COMPLETE_JOB':
      const { id, status, error } = action.payload;
      return {
        ...state,
        isProcessing: false,
        currentJobId: null,
        jobs: state.jobs.map(job =>
          job.id === id
            ? { 
                ...job, 
                status, 
                error,
                finishedAt: Date.now(),
              }
            : job
        ),
      };

    case 'CANCEL_JOB':
      const jobToCancel = state.jobs.find(j => j.id === action.payload.id);
      if (jobToCancel?.abortController) {
        jobToCancel.abortController.abort();
      }
      
      return {
        ...state,
        isProcessing: state.currentJobId === action.payload.id ? false : state.isProcessing,
        currentJobId: state.currentJobId === action.payload.id ? null : state.currentJobId,
        jobs: state.jobs.map(job =>
          job.id === action.payload.id
            ? { ...job, status: 'cancelled' as JobStatus, finishedAt: Date.now() }
            : job
        ),
      };

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        jobs: state.jobs.filter(job => 
          job.status === 'queued' || job.status === 'running'
        ),
      };

    default:
      return state;
  }
}

// Create context
const QueueContext = createContext<QueueContextType | null>(null);

// Provider component
export function QueueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(queueReducer, initialState);
  const executorsRef = useRef<Partial<Record<JobType, any>>>({});
  const processingRef = useRef(false);
  
  // Get Gmail permissions to check for refresh token
  const { hasRefreshToken } = useGmailPermissions();
  
  // State for the reauth dialog
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  
  // Track if user has dismissed the reauth dialog (don't show again until new job or reconnect)
  const [reauthDialogDismissed, setReauthDialogDismissed] = useState(false);

  // Register an executor for a specific job type
  const registerExecutor = useCallback((type: JobType, executor: JobExecutor) => {
    logger.debug(`[Queue] Registering executor for type: ${type}`);
    executorsRef.current[type] = executor;
  }, []);

  // Enqueue a new job
  const enqueue = useCallback((type: JobType, payload: any): string => {
    const jobId = uuidv4();
    const abortController = new AbortController();
    
    // Extract target senders for UI display
    let targetSenders: string[] | undefined;
    if ('senders' in payload && Array.isArray(payload.senders)) {
      targetSenders = payload.senders.map((s: any) => s.email || s);
    } else if ('senderEmail' in payload) {
      targetSenders = [payload.senderEmail];
    }

    const actionTimestamps: Record<string, number> = {};
    const mapJobTypeToAction = (jobType: JobType): Parameters<typeof storeSenderAction>[0]['type'] => {
      switch (jobType) {
        case 'delete':
          return 'delete';
        case 'deleteWithExceptions':
          return 'delete_with_exceptions';
        case 'markRead':
          return 'mark_as_read';
        case 'applyLabel':
          return 'apply_label';
        case 'modifyLabel':
          return 'modify_label';
        case 'createFilter':
          return 'create_filter';
        case 'unsubscribe':
          return 'unsubscribe';
        default:
          return 'delete';
      }
    };

    if (targetSenders) {
      const actionType = mapJobTypeToAction(type);
      targetSenders.forEach(email => {
        const ts = Date.now();
        
        // For modifyLabel jobs, include label metadata
        if (type === 'modifyLabel' && 'labelIds' in payload && 'actionType' in payload) {
          const actionData = { 
            senderEmail: email, 
            timestamp: ts, 
            type: actionType, 
            status: 'pending' as const,
            labelIds: payload.labelIds,
            actionType: payload.actionType
          };
          
          // Debug logging
          if (email.includes('groupme') || email.includes('support@groupme')) {
            console.log(`[DEBUG] Storing modifyLabel action for ${email}:`, actionData);
          }
          
          storeSenderAction(actionData);
        } else {
          storeSenderAction({ senderEmail: email, timestamp: ts, type: actionType, status: 'pending' });
        }
        
        actionTimestamps[email] = ts;
      })
    }

    const job: Job & { actionTimestamps?: Record<string, number> } = {
      id: jobId,
      type,
      payload,
      createdAt: Date.now(),
      progress: { current: 0, total: 0 },
      status: 'queued',
      abortController,
      targetSenders,
      actionTimestamps,
    };

    dispatch({ type: 'ENQUEUE_JOB', payload: job });
    
    // Reset reauth dialog dismissal when new job is added
    setReauthDialogDismissed(false);
    
    logger.debug('Job enqueued', { 
      component: 'QueueProvider', 
      jobId, 
      type, 
      payload 
    });
    return jobId;
  }, []);

  // Cancel a job
  const cancel = useCallback((jobId: string) => {
    logger.debug('Cancelling job', { component: 'QueueProvider', jobId });

    // Mark any pending sender actions related to this job as failed/cancelled
    const jobToCancel = state.jobs.find(j => j.id === jobId) as (Job & { actionTimestamps?: Record<string, number> }) | undefined;
    if (jobToCancel?.actionTimestamps) {
      Object.entries(jobToCancel.actionTimestamps).forEach(([email, ts]) => {
        updateActionStatus(email, ts, 'failed', 'cancelled');
      });
    }

    dispatch({ type: 'CANCEL_JOB', payload: { id: jobId } });
  }, [state.jobs]);

  // Clear completed jobs
  const clearCompleted = useCallback(() => {
    logger.debug('Clearing completed jobs', { component: 'QueueProvider' });
    dispatch({ type: 'CLEAR_COMPLETED' });
  }, []);

  // Process next job in queue
  const processNextJob = useCallback(async () => {
    // Prevent concurrent processing
    if (processingRef.current || state.isProcessing) {
      return;
    }

    // Find next queued job
    const nextJob = state.jobs.find(job => job.status === 'queued');
    if (!nextJob) {
      return;
    }

    // 🔒 CRITICAL: Check for refresh token before starting any job
    if (!hasRefreshToken) {
      logger.debug('No refresh token available, pausing queue until reconnection', { 
        component: 'QueueProvider' 
      });
      logger.debug('Job waiting for Gmail reconnection', { 
        component: 'QueueProvider', 
        jobId: nextJob.id, 
        jobType: nextJob.type 
      });
      
      // Show the Reauth Dialog only if user hasn't dismissed it
      if (!showReauthDialog && !reauthDialogDismissed) {
        logger.debug('Opening Reauth dialog for queue processing', { 
          component: 'QueueProvider' 
        });
        setShowReauthDialog(true);
        
        // Also show a toast to explain why the modal appeared
        toast.info('Gmail Connection Required', {
          description: 'Queue processing paused. Please reconnect Gmail to continue.',
          duration: 4000,
        });
      }
      
      // Don't fail the job, just pause processing
      return;
    }

    // Check if we have an executor for this job type
    const executor = executorsRef.current[nextJob.type];
    if (!executor) {
      logger.error('No executor found for job type', { 
        component: 'QueueProvider', 
        jobType: nextJob.type 
      });
      dispatch({ 
        type: 'COMPLETE_JOB', 
        payload: { 
          id: nextJob.id, 
          status: 'error', 
          error: `No executor available for ${nextJob.type}` 
        } 
      });
      return;
    }

    // Start processing
    processingRef.current = true;
    logger.debug('Starting job', { 
      component: 'QueueProvider', 
      jobId: nextJob.id, 
      jobType: nextJob.type 
    });
    dispatch({ type: 'START_JOB', payload: { id: nextJob.id } });

    try {
      // Create progress callback
      const onProgress: ProgressCallback = (current, total) => {
        dispatch({ 
          type: 'UPDATE_PROGRESS', 
          payload: { 
            id: nextJob.id, 
            progress: { current, total } 
          } 
        });
      };

      // Execute the job
      const result: ExecutorResult = await executor(
        nextJob.payload,
        onProgress,
        nextJob.abortController!.signal
      );

      // Handle completion
      if (result.success) {
        // Mark pending actions as completed for each sender
        if ((nextJob as any).actionTimestamps) {
          nextJob.targetSenders?.forEach(email => {
            const ts = (nextJob as any).actionTimestamps[email];
            if (ts) {
              updateActionStatus(email, ts, 'completed');
            }
          });
        }
        logger.debug('Job completed successfully', { 
          component: 'QueueProvider', 
          jobId: nextJob.id 
        });
        dispatch({ 
          type: 'COMPLETE_JOB', 
          payload: { id: nextJob.id, status: 'success' } 
        });
      } else {
        // Mark pending actions as failed for each sender
        if ((nextJob as any).actionTimestamps) {
          nextJob.targetSenders?.forEach(email => {
            const ts = (nextJob as any).actionTimestamps[email];
            if (ts) {
              updateActionStatus(email, ts, 'failed', result.error);
            }
          });
        }
        logger.error('Job failed', { 
          component: 'QueueProvider', 
          jobId: nextJob.id, 
          error: result.error 
        });
        dispatch({ 
          type: 'COMPLETE_JOB', 
          payload: { 
            id: nextJob.id, 
            status: 'error', 
            error: result.error 
          } 
        });
      }
    } catch (error: any) {
      logger.error('Job threw exception', { 
        component: 'QueueProvider', 
        jobId: nextJob.id, 
        error 
      });
      dispatch({ 
        type: 'COMPLETE_JOB', 
        payload: { 
          id: nextJob.id, 
          status: 'error', 
          error: error.message || 'Unknown error occurred' 
        } 
      });
    } finally {
      processingRef.current = false;
    }
  }, [state.jobs, state.isProcessing, hasRefreshToken, showReauthDialog, setShowReauthDialog, reauthDialogDismissed]);

  // Watch for new jobs and process them
  useEffect(() => {
    // Check if we should process next job
    if (!state.isProcessing && state.jobs.some(j => j.status === 'queued')) {
      processNextJob();
    }
  }, [state.jobs, state.isProcessing, processNextJob]);

  // Watch for refresh token availability to resume queue
  useEffect(() => {
    // If refresh token becomes available and there are queued jobs, show resume message
    if (hasRefreshToken && state.jobs.some(j => j.status === 'queued') && !state.isProcessing) {
      logger.debug('Refresh token available, resuming queue processing', { 
        component: 'QueueProvider' 
      });
      
      // Close the reauth dialog if it's open
      if (showReauthDialog) {
        logger.debug('Closing Reauth dialog - auth restored', { 
          component: 'QueueProvider' 
        });
        setShowReauthDialog(false);
      }
      
      // Reset dismissal state when user reconnects
      setReauthDialogDismissed(false);
      
      // DISABLED: Toast notification when queue resumes
      // toast.success('Gmail Connected', {
      //   description: 'Queue processing will resume automatically.',
      //   duration: 3000,
      // });
    }
  }, [hasRefreshToken, state.jobs, state.isProcessing, showReauthDialog, setShowReauthDialog]);

  // Context value
  const value: QueueContextType = {
    jobs: state.jobs,
    isProcessing: state.isProcessing,
    currentJobId: state.currentJobId,
    enqueue,
    cancel,
    clearCompleted,
    showReauthDialog: showReauthDialog,
    setShowReauthDialog: setShowReauthDialog,
  };

  // Make registerExecutor available globally for hooks to use
  // This is a temporary solution until we refactor the hooks
  if (typeof window !== 'undefined') {
    (window as any).__queueRegisterExecutor = registerExecutor;
  }

  return (
    <QueueContext.Provider value={value}>
      {children}
      {showReauthDialog && (
        <ReauthDialog 
          open={showReauthDialog}
          onOpenChange={(open) => {
            setShowReauthDialog(open);
            if (!open) {
              // User explicitly closed the dialog - mark as dismissed
              logger.debug('User dismissed ReauthDialog - will not show again until new job or reconnect', { 
                component: 'QueueProvider' 
              });
              setReauthDialogDismissed(true);
            }
          }}
          type="expired"
        />
      )}
    </QueueContext.Provider>
  );
}

// Hook to use queue context
export function useQueueContext() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueContext must be used within QueueProvider');
  }
  return context;
} 