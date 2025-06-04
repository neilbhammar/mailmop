/**
 * Queue System Type Definitions
 * 
 * Central types for the job queue system that manages
 * all long-running operations in MailMop
 */

import { RuleGroup } from '@/lib/gmail/buildQuery';

// Job types that can be queued
export type JobType =
  | 'analysis'
  | 'delete'
  | 'deleteWithExceptions' 
  | 'markRead'
  | 'applyLabel'
  | 'createFilter'
  | 'unsubscribe'
  | 'modifyLabel';

// Status of a job in the queue
export type JobStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled';

// Base job interface with generic payload
export interface Job<TPayload = any> {
  id: string;                    // Unique identifier (uuid)
  type: JobType;                 // Type of job
  payload: TPayload;             // Job-specific parameters
  createdAt: number;             // Timestamp when job was created
  startedAt?: number;            // Timestamp when job started processing
  finishedAt?: number;           // Timestamp when job completed
  progress: {                    // Progress tracking
    current: number;             // Current progress count
    total: number;               // Total items to process
  };
  status: JobStatus;             // Current status
  error?: string;                // Error message if failed
  abortController?: AbortController; // For cancellation support
  targetSenders?: string[];      // For UI display in ProcessQueue
}

// Specific payload types for type safety
export interface DeleteJobPayload {
  senders: { 
    email: string; 
    count: number;               // Estimated email count
  }[];
  initialEtaMs: number;          // Pre-calculated ETA for stable initial display
}

export interface DeleteWithExceptionsJobPayload {
  senders: { 
    email: string; 
    count: number;               // Estimated email count
  }[];
  filterRules: RuleGroup[];      // Filter rules for partial deletion
  initialEtaMs: number;          // Pre-calculated ETA for stable initial display
}

export interface MarkReadJobPayload {
  senders: { 
    email: string; 
    unreadCount: number;         // Number of unread emails
  }[];
}

export interface AnalysisJobPayload {
  type: 'full' | 'quick';        // Analysis mode
  initialEtaMs: number;          // Pre-calculated ETA from Step2 for stable initial display
}

export interface CreateFilterJobPayload {
  senderEmail: string;
  filterAction: 'archive' | 'delete' | 'label' | 'markRead';
  labelName?: string;            // If action is 'label'
}

export interface ApplyLabelJobPayload {
  senders: string[];             // Email addresses
  labelName: string;             // Label to apply
  action: 'add' | 'remove';      // Add or remove label
}

export interface UnsubscribeJobPayload {
  senderEmail: string;
  unsubscribeUrl?: string;       // Direct unsubscribe URL if available
  method: 'link' | 'mailto' | 'auto'; // Unsubscribe method
}

export interface ModifyLabelJobPayload {
  senders: { 
    email: string; 
    emailCount: number;          // Estimated email count
  }[];
  labelIds: string[];            // Label IDs to add or remove
  actionType: 'add' | 'remove';  // Whether to add or remove labels
  initialEtaMs: number;          // Pre-calculated ETA for stable initial display
}

// Type guard functions
export function isDeleteJob(job: Job): job is Job<DeleteJobPayload> {
  return job.type === 'delete';
}

export function isDeleteWithExceptionsJob(job: Job): job is Job<DeleteWithExceptionsJobPayload> {
  return job.type === 'deleteWithExceptions';
}

export function isMarkReadJob(job: Job): job is Job<MarkReadJobPayload> {
  return job.type === 'markRead';
}

export function isAnalysisJob(job: Job): job is Job<AnalysisJobPayload> {
  return job.type === 'analysis';
}

// Progress callback type used by executors
export type ProgressCallback = (current: number, total: number) => void;

// Executor function signature
export type JobExecutor<TPayload = any> = (
  payload: TPayload,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
) => Promise<{ success: boolean; error?: string }>;

// Result type returned by executors
export interface ExecutorResult {
  success: boolean;
  error?: string;
  processedCount?: number;
} 