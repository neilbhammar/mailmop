// Constants for runtime estimation
export const OPERATION_RATES = {
  analysis: 2250, // emails per minute
  deletion: 300, // emails per minute (example rate)
  markUnread: 500, // emails per minute (example rate)
  // Add other operations as needed
} as const;

export const QUICK_OPERATION_MULTIPLIER = 0.5; // 60% of emails for quick operations

export type OperationType = keyof typeof OPERATION_RATES;
export type OperationMode = 'full' | 'quick';

interface EstimateRuntimeParams {
  operationType: OperationType;
  emailCount: number;
  mode?: OperationMode; // Optional for all operations - if quick, applies the multiplier
}

/**
 * Calculates the effective number of emails to process based on operation type and mode
 */
export function getEffectiveEmailCount(
  totalEmails: number,
  mode: OperationMode = 'full',
  operationType: OperationType = 'analysis'
): number {
  // First apply quick mode multiplier if applicable
  let effectiveCount = mode === 'quick' 
    ? Math.ceil(totalEmails * QUICK_OPERATION_MULTIPLIER)
    : totalEmails;
    
  // For analysis operations, round down to nearest 100 for better granularity
  if (operationType === 'analysis') {
    effectiveCount = Math.max(100, Math.floor(effectiveCount / 100) * 100);
  }
  
  return effectiveCount;
}

/**
 * Estimates the runtime in milliseconds for a Gmail operation
 * @param operationType - Type of operation (analysis, deletion, etc.)
 * @param emailCount - Number of emails to process (total inbox for analysis, selected emails for other ops)
 * @param mode - Whether to process all emails ('full') or use quick mode multiplier ('quick')
 * @returns Estimated runtime in milliseconds
 */
export function estimateRuntimeMs({ 
  operationType, 
  emailCount, 
  mode = 'full' 
}: EstimateRuntimeParams): number {
  // Get the rate for this operation type
  const ratePerMinute = OPERATION_RATES[operationType];
  
  // Get effective email count using our helper
  const effectiveEmailCount = getEffectiveEmailCount(emailCount, mode, operationType);

  // Calculate minutes with 1-minute minimum
  const minutesToProcess = Math.max(1, effectiveEmailCount / ratePerMinute);
  return minutesToProcess * 60 * 1000;
}

/**
 * Formats a duration in milliseconds into a human-readable string
 * @param ms Duration in milliseconds
 * @returns Formatted string like "5 minutes" or "2 hours 30 minutes"
 */
export function formatDuration(ms: number): string {
  const minutes = Math.ceil(ms / (1000 * 60));
  
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  
  return `${hours} hour${hours === 1 ? '' : 's'} ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
} 