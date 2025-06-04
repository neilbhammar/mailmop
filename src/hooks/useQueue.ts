/**
 * useQueue Hook
 * 
 * Provides a clean API for components to interact with the job queue system.
 * Wraps the QueueContext with convenient helper methods and computed values.
 */

import { useQueueContext } from '@/context/QueueProvider';
import { Job, JobType } from '@/types/queue';

export function useQueue() {
  const context = useQueueContext();
  
  // Sort jobs by creation time (most recent first)
  const sortedJobs = [...context.jobs].sort((a, b) => b.createdAt - a.createdAt);
  
  // Computed values for convenience
  const currentJob = sortedJobs.find(j => j.status === 'running');
  const queuedJobs = sortedJobs.filter(j => j.status === 'queued');
  const completedJobs = sortedJobs.filter(j => j.status === 'success' || j.status === 'error');
  const hasActiveJobs = sortedJobs.some(j => j.status === 'running' || j.status === 'queued');
  
  // Helper to get job by ID
  const getJob = (jobId: string): Job | undefined => {
    return sortedJobs.find(j => j.id === jobId);
  };
  
  // Helper to get jobs by type
  const getJobsByType = (type: JobType): Job[] => {
    return sortedJobs.filter(j => j.type === type);
  };
  
  // Helper to check if a specific type is currently running
  const isTypeRunning = (type: JobType): boolean => {
    return sortedJobs.some(j => j.type === type && j.status === 'running');
  };
  
  // Helper to get queue position for a job
  const getQueuePosition = (jobId: string): number => {
    const queuedJobs = sortedJobs.filter(j => j.status === 'queued');
    const index = queuedJobs.findIndex(j => j.id === jobId);
    return index === -1 ? -1 : index + 1; // 1-indexed for UI display
  };
  
  return {
    // Core functionality from context
    jobs: sortedJobs,
    enqueue: context.enqueue,
    cancel: context.cancel,
    clearCompleted: context.clearCompleted,
    
    // Computed values
    currentJob,
    queuedJobs,
    completedJobs,
    hasActiveJobs,
    isProcessing: context.isProcessing,
    
    // Helper methods
    getJob,
    getJobsByType,
    isTypeRunning,
    getQueuePosition,
    
    // Counts for UI
    counts: {
      total: sortedJobs.length,
      queued: queuedJobs.length,
      completed: completedJobs.length,
      running: currentJob ? 1 : 0,
    },
  };
} 