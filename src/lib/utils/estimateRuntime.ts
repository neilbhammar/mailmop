import { AnalysisType } from '@/types/actions';

export type OperationType = 'analysis' | 'delete' | 'block' | 'unsubscribe' | 'mark';
export type OperationMode = 'full' | 'quick' | 'single'; // Added 'single' for non-analysis ops

// Constants for estimation (empirical or best guesses)
const EMAILS_PER_MINUTE_ANALYSIS = 2000; // Emails processed per minute during analysis
const EMAILS_PER_MINUTE_DELETE = 500;  // Emails processed per minute during deletion (GUESS)
const QUICK_ANALYSIS_PERCENTAGE = 0.25; // Quick analysis scans 25% of emails
const BATCH_API_OVERHEAD_MS = 300; // Estimated overhead per API batch call
const EMAILS_PER_BATCH = 45; // Typical batch size used in analysis

// Thresholds for mode selection (if needed)
const QUICK_MODE_THRESHOLD = 50000; // Use quick mode above 50k emails automatically? (Example)

/**
 * Gets the effective number of emails to process based on mode.
 * For non-analysis ops, it's usually the provided count.
 * @param totalEmails Total emails in the inbox (for analysis) or selected (for other ops)
 * @param mode 'full', 'quick', or 'single'
 * @param operationType The type of operation
 * @returns The number of emails the operation will likely process
 */
export function getEffectiveEmailCount(
  totalEmails: number,
  mode: OperationMode,
  operationType: OperationType
): number {
  if (operationType === 'analysis') {
    if (mode === 'quick') {
      // Quick analysis processes a fraction of the total emails
      return Math.max(1, Math.ceil(totalEmails * QUICK_ANALYSIS_PERCENTAGE));
    } else {
      // Full analysis processes all emails
      return totalEmails;
    }
  } else {
    // For delete, block, unsubscribe, the count is usually what's selected/provided
    // 'mode' might not be relevant, or 'single' could represent acting on one sender
    // vs 'full'/'quick' acting on a bulk selection based on analysis results.
    // For now, assume totalEmails passed IS the effective count for non-analysis ops.
    return totalEmails;
  }
}


/**
 * Estimates the runtime for a Gmail operation.
 * @param operationType Type of operation ('analysis', 'delete', etc.)
 * @param emailCount Total number of emails involved (either inbox total or selected count)
 * @param mode Operation mode ('full', 'quick', 'single')
 * @returns Estimated runtime in milliseconds.
 */
export function estimateRuntimeMs({
  operationType,
  emailCount,
  mode,
}: {
  operationType: OperationType;
  emailCount: number;
  mode: OperationMode;
}): number {
  const effectiveEmails = getEffectiveEmailCount(emailCount, mode, operationType);
  let emailsPerMinute: number;
  let calculationBasis: string;

  switch (operationType) {
    case 'analysis':
      emailsPerMinute = EMAILS_PER_MINUTE_ANALYSIS;
      calculationBasis = 'analysis rate';
      break;
    case 'delete':
      // We assume deletion is slower due to individual operations or confirmations needed
      emailsPerMinute = EMAILS_PER_MINUTE_DELETE;
      calculationBasis = 'delete rate';
      break;
    case 'mark':
      // Marking as read operations are typically faster than deletion
      emailsPerMinute = EMAILS_PER_MINUTE_ANALYSIS;
      calculationBasis = 'mark rate';
      break;
    // Add cases for 'block', 'unsubscribe' when implemented, likely similar to delete
    default:
      console.warn(`Unknown operation type for estimation: ${operationType}. Defaulting to delete rate.`);
      emailsPerMinute = EMAILS_PER_MINUTE_DELETE;
      calculationBasis = 'default (delete) rate';
  }

  if (effectiveEmails === 0 || emailsPerMinute === 0) {
    console.log(`[Estimate] Zero effective emails or rate for ${operationType}, returning 0ms`);
    return 0;
  }

  // Base time based on processing rate
  const baseTimeMs = (effectiveEmails / emailsPerMinute) * 60 * 1000;

  // Estimate API call overhead (more relevant for analysis batching)
  // For deletion, batchDelete handles up to 1000, so fewer batches might be needed
  let apiOverheadMs = 0;
  if (operationType === 'analysis') {
     const estimatedBatches = Math.ceil(effectiveEmails / EMAILS_PER_BATCH);
     apiOverheadMs = estimatedBatches * BATCH_API_OVERHEAD_MS;
  } else if (operationType === 'delete') {
    // Batch delete handles up to 1000 IDs per call
    const estimatedBatches = Math.ceil(effectiveEmails / 1000);
    // Overhead might be different for delete vs. fetch metadata
    apiOverheadMs = estimatedBatches * BATCH_API_OVERHEAD_MS * 1.5; // Adjust overhead factor if needed
  }


  const totalEstimatedMs = baseTimeMs + apiOverheadMs;

  console.log(`[Estimate] Operation: ${operationType} (${mode})`);
  console.log(`[Estimate] Effective Emails: ${effectiveEmails.toLocaleString()}`);
  console.log(`[Estimate] Basis: ${emailsPerMinute}/min (${calculationBasis})`);
  console.log(`[Estimate] Base Time: ${formatDuration(baseTimeMs)}`);
  console.log(`[Estimate] API Overhead: ${formatDuration(apiOverheadMs)}`);
  console.log(`[Estimate] Total Estimated: ${formatDuration(totalEstimatedMs)}`);

  // Return at least 1 second for very small counts
  return Math.max(1000, Math.round(totalEstimatedMs));
}

/**
 * Formats milliseconds into a human-readable duration string.
 * e.g., 123456 ms -> "2m 3s"
 * @param ms Duration in milliseconds.
 * @returns Human-readable duration string.
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  let durationString = '';

  if (hours > 0) {
    durationString += `${hours}h `;
  }
  if (minutes > 0) {
    durationString += `${minutes}m `;
  }
  // Always show seconds if the total duration is less than a minute OR if there are hours/minutes shown
  // Or if it's exactly 0
  if (ms < 60000 || hours > 0 || minutes > 0 || ms === 0) {
     // Show seconds, ensuring it's not 0s if minutes/hours are present unless total is 0
     if (seconds > 0 || durationString === '') {
       durationString += `${seconds}s`;
     }
  }

  // Handle edge case where result might be empty (e.g., ms=500) -> "0s"
  // Or if only minutes/hours were added and seconds was 0, trim trailing space
  durationString = durationString.trim();
  if (durationString === '') {
      // If ms was > 0 but resulted in empty string (e.g. 500ms rounds to 0s)
      // represent it as <1s? Or stick to 0s? Let's show 0s for simplicity.
      return '0s';
  }


  return durationString;
}
