/**
 * Queue System Type Definitions
 */

import { RuleGroup } from '../lib/buildQuery';

export type JobType =
  | 'analysis'
  | 'delete'
  | 'deleteWithExceptions'
  | 'markRead'
  | 'applyLabel'
  | 'createFilter'
  | 'unsubscribe'
  | 'modifyLabel';

export type JobStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled';

export interface Job<TPayload = unknown> {
  id: string;
  type: JobType;
  payload: TPayload;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  progress: {
    current: number;
    total: number;
  };
  status: JobStatus;
  error?: string;
  abortController?: AbortController;
  targetSenders?: string[];
}

export interface DeleteJobPayload {
  senders: { email: string; count: number }[];
  initialEtaMs: number;
}

export interface DeleteWithExceptionsJobPayload {
  senders: { email: string; count: number }[];
  filterRules: RuleGroup[];
  initialEtaMs: number;
}

export interface MarkReadJobPayload {
  senders: { email: string; unreadCount: number }[];
}

export interface AnalysisJobPayload {
  type: 'full' | 'quick';
  initialEtaMs: number;
}

export interface CreateFilterJobPayload {
  senders: string[];
  labelIds: string[];
  actionType: 'add' | 'remove';
  initialEtaMs?: number;
}

export interface ApplyLabelJobPayload {
  senders: string[];
  labelName: string;
  action: 'add' | 'remove';
}

export interface UnsubscribeJobPayload {
  senderEmail: string;
  methodDetails: {
    type: 'url' | 'mailto';
    value: string;
    requiresPost?: boolean;
  };
  initialEtaMs?: number;
}

export interface ModifyLabelJobPayload {
  senders: { email: string; emailCount: number }[];
  labelIds: string[];
  actionType: 'add' | 'remove';
  initialEtaMs?: number;
}

export type ProgressCallback = (current: number, total: number) => void;

export type JobExecutor<TPayload = unknown> = (
  payload: TPayload,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
) => Promise<{ success: boolean; error?: string }>;

export interface ExecutorResult {
  success: boolean;
  error?: string;
  processedCount?: number;
}
