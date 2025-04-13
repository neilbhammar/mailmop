// Constants for runtime estimation
export const OPERATION_RATES = {
  analysis: 750, // emails per minute
  deletion: 300, // emails per minute (example rate)
  markUnread: 500, // emails per minute (example rate)
  // Add other operations as needed
} as const;

export const QUICK_OPERATION_MULTIPLIER = 0.6; // 60% of emails for quick operations

export type OperationType = keyof typeof OPERATION_RATES;
export type OperationMode = 'full' | 'quick';

interface EstimateRuntimeParams {
  operationType: OperationType;
  emailCount: number;
  mode?: OperationMode; // Optional for all operations - if quick, applies the multiplier
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
  
  // Calculate effective email count
  let effectiveEmailCount = emailCount;
  
  if (mode === 'quick') {
    // For any quick operation, use the multiplier
    effectiveEmailCount = Math.ceil(emailCount * QUICK_OPERATION_MULTIPLIER);
  }
  
  // For analysis operations, round down to nearest 1000
  if (operationType === 'analysis' && mode === 'full') {
    effectiveEmailCount = Math.floor(emailCount / 1000) * 1000;
  }

  // Convert emails/minute to milliseconds
  const minutesToProcess = effectiveEmailCount / ratePerMinute;
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