/**
 * actionLog.ts
 * 
 * Manages action logs in localStorage for operations like delete, unsubscribe, etc.
 * Separate from analysis logs to avoid confusion and maintain clean data separation.
 */

import { LocalActionLog, ActionType, ActionEndType, ActionStatus } from '@/types/actions';

const CURRENT_ANALYSIS_KEY = 'mailmop_current_analysis';
export const ACTION_STATS_UPDATED_EVENT = 'mailmop:action-stats-updated';

// Helper to notify components of action stats changes
function notifyActionStatsChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACTION_STATS_UPDATED_EVENT));
}

const ACTION_LOG_KEY = 'mailmop_current_action';

interface ActionLog {
  clientActionId: string;
  type: 'delete' | 'delete_with_exceptions' | 'unsubscribe' | 'mark_as_read'; // Add more action types as needed
  estimatedRuntimeMs: number;
  totalEmails: number;
  totalEstimatedBatches: number;
  query: string;
  supabaseLogId?: string;
  progress?: {
    batchesProcessed: number;
    emailsProcessed: number;
  };
  endType?: 'success' | 'user_stopped' | 'runtime_error';
  errorMessage?: string;
}

/**
 * Creates a new action log entry in localStorage
 */
export function createActionLog(log: Omit<ActionLog, 'supabaseLogId' | 'progress' | 'endType' | 'errorMessage'>) {
  localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(log));
}

/**
 * Updates the Supabase log ID for the current action
 */
export function updateSupabaseLogId(id: string) {
  const currentLog = getCurrentActionLog();
  if (currentLog) {
    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify({ ...currentLog, supabaseLogId: id }));
  }
}

/**
 * Updates progress for the current action
 */
export function updateActionProgress(batchesProcessed: number, emailsProcessed: number) {
  const currentLog = getCurrentActionLog();
  if (currentLog) {
    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify({
      ...currentLog,
      progress: { batchesProcessed, emailsProcessed }
    }));
  }
}

/**
 * Marks the current action as complete
 */
export function completeActionLog(endType: ActionLog['endType'], errorMessage?: string) {
  const currentLog = getCurrentActionLog();
  if (currentLog) {
    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify({
      ...currentLog,
      endType,
      errorMessage
    }));
  }
}

/**
 * Gets the current action log if any
 */
export function getCurrentActionLog(): ActionLog | null {
  const logStr = localStorage.getItem(ACTION_LOG_KEY);
  return logStr ? JSON.parse(logStr) : null;
}

/**
 * Clears the current action log
 */
export function clearCurrentActionLog() {
  localStorage.removeItem(ACTION_LOG_KEY);
}

/**
 * Creates and stores a new action log in localStorage
 */
export function createLocalActionLog({
  clientActionId,
  type,
  estimatedRuntimeMs,
  totalEmails,
  totalEstimatedBatches,
  query,
  filters
}: {
  clientActionId: string;
  type: ActionType;
  estimatedRuntimeMs: number;
  totalEmails: number;
  totalEstimatedBatches?: number;
  query?: string;
  filters?: Record<string, any>;
}): LocalActionLog {
  const now = new Date().toISOString();
  
  // Construct filters: use passed filters object, or fallback to query if provided
  const logFilters = filters ?? (query ? { query } : undefined);

  const actionLog: LocalActionLog = {
    client_action_id: clientActionId,
    analysis_id: null,
    type,
    status: 'started',
    filters: logFilters,
    created_at: now,
    start_time: now,
    last_update_time: now,
    estimated_runtime_ms: estimatedRuntimeMs,
    current_batch_index: 0,
    total_estimated_batches: totalEstimatedBatches,
    total_estimated_emails: totalEmails,
    processed_email_count: 0,
    completed_at: null,
    end_type: null,
    completion_reason: null
  };

  localStorage.setItem(CURRENT_ANALYSIS_KEY, JSON.stringify(actionLog));
  // Also update status immediately if needed
  // (Assuming status update is handled separately after creation)
  return actionLog;
}

/**
 * Updates the current analysis log with Supabase ID
 */
export function updateAnalysisId(supabaseId: string): void {
  const current = getCurrentAnalysis();
  if (!current) return;

  const updated = { 
    ...current, 
    analysis_id: supabaseId,
    last_update_time: new Date().toISOString()
  };
  localStorage.setItem(CURRENT_ANALYSIS_KEY, JSON.stringify(updated));
}

/**
 * Updates batch progress in the current analysis
 */
export function updateAnalysisProgress(
  batchIndex: number,
  processedEmails: number
): void {
  const current = getCurrentAnalysis();
  if (!current) return;

  const updated = {
    ...current,
    current_batch_index: batchIndex,
    processed_email_count: processedEmails,
    last_update_time: new Date().toISOString()
  };
  localStorage.setItem(CURRENT_ANALYSIS_KEY, JSON.stringify(updated));
}

/**
 * Completes the current analysis with final status
 */
export function completeAnalysis(
  endType: ActionEndType,
  reason?: string
): void {
  const current = getCurrentAnalysis();
  if (!current) return;

  const now = new Date().toISOString();
  const updated = {
    ...current,
    status: 'completed',
    completed_at: now,
    last_update_time: now,
    end_type: endType,
    completion_reason: reason || null
  };
  localStorage.setItem(CURRENT_ANALYSIS_KEY, JSON.stringify(updated));
  
  // Notify components that action stats have changed
  notifyActionStatsChange();
}

/**
 * Gets the current analysis if one exists
 */
export function getCurrentAnalysis(): LocalActionLog | null {
  const stored = localStorage.getItem(CURRENT_ANALYSIS_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as LocalActionLog;
  } catch (error) {
    console.error('Failed to parse stored analysis:', error);
    return null;
  }
}

/**
 * Clears the current analysis from localStorage
 */
export function clearCurrentAnalysis(): void {
  localStorage.removeItem(CURRENT_ANALYSIS_KEY);
} 