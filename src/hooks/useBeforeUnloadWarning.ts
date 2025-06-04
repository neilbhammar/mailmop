/**
 * useBeforeUnloadWarning Hook
 * 
 * Warns users before they close the tab/window when there are active or queued 
 * processes in the queue that haven't been cancelled. This prevents accidental
 * interruption of ongoing operations like email deletion, analysis, etc.
 */

import { useEffect } from 'react';
import { useQueue } from './useQueue';
import { JobType } from '@/types/queue';

export function useBeforeUnloadWarning() {
  const { hasActiveJobs, currentJob, queuedJobs } = useQueue();

  useEffect(() => {
    // Only add the warning if there are active jobs (running or queued)
    if (!hasActiveJobs) {
      return;
    }

    // Handler for the beforeunload event
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Create a descriptive warning message based on current queue state
      let message = '';
      
      if (currentJob) {
        // There's a currently running job
        const jobTypeDisplayName = getJobDisplayName(currentJob.type);
        message = `You have an active ${jobTypeDisplayName} operation in progress. `;
        
        if (queuedJobs.length > 0) {
          message += `There are also ${queuedJobs.length} operation${queuedJobs.length === 1 ? '' : 's'} waiting in the queue. `;
        }
        
        message += 'Closing this tab will cancel all operations. Are you sure you want to leave?';
      } else if (queuedJobs.length > 0) {
        // Only queued jobs, no active job
        message = `You have ${queuedJobs.length} operation${queuedJobs.length === 1 ? '' : 's'} queued to run. Closing this tab will cancel ${queuedJobs.length === 1 ? 'it' : 'them'}. Are you sure you want to leave?`;
      }

      // Set the return value to show the browser's default warning dialog
      // Note: Modern browsers ignore custom messages and show their own generic warning
      event.preventDefault();
      event.returnValue = message; // For older browsers
      return message; // For some browsers
    };

    // Add the event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasActiveJobs, currentJob, queuedJobs]);
}

/**
 * Helper function to get user-friendly display names for job types
 */
function getJobDisplayName(jobType: JobType): string {
  switch (jobType) {
    case 'analysis':
      return 'inbox analysis';
    case 'delete':
      return 'email deletion';
    case 'deleteWithExceptions':
      return 'selective email deletion';
    case 'markRead':
      return 'mark as read';
    case 'unsubscribe':
      return 'unsubscribe';
    case 'createFilter':
      return 'filter creation';
    case 'applyLabel':
      return 'label application';
    case 'modifyLabel':
      return 'label modification';
    default:
      // This should never happen since we handle all JobType cases above
      const exhaustiveCheck: never = jobType;
      return exhaustiveCheck;
  }
} 