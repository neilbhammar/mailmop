import { LocalActionLog, AnalysisType, ActionEndType } from '@/types/actions';

const CURRENT_ANALYSIS_KEY = 'mailmop_current_analysis';
export const ACTION_STATS_UPDATED_EVENT = 'mailmop:action-stats-updated';

// Helper to notify components of action stats changes
function notifyActionStatsChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACTION_STATS_UPDATED_EVENT));
}

/**
 * Creates and stores a new analysis action log in localStorage
 */
export function createLocalActionLog({
  clientActionId,
  type,
  estimatedRuntimeMs,
  totalEmails,
  totalEstimatedBatches,
  query
}: {
  clientActionId: string;
  type: AnalysisType;
  estimatedRuntimeMs: number;
  totalEmails: number;
  totalEstimatedBatches: number;
  query: string;
}): LocalActionLog {
  const actionLog: LocalActionLog = {
    client_action_id: clientActionId,
    analysis_id: null,
    type: 'analysis',
    status: 'started',
    filters: {
      type,
      query
    },
    created_at: new Date().toISOString(),
    start_time: new Date().toISOString(),
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
  return actionLog;
}

/**
 * Updates the current analysis log with Supabase ID
 */
export function updateAnalysisId(supabaseId: string): void {
  const current = getCurrentAnalysis();
  if (!current) return;

  const updated = { ...current, analysis_id: supabaseId };
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
    processed_email_count: processedEmails
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

  const updated = {
    ...current,
    status: 'completed',
    completed_at: new Date().toISOString(),
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