/**
 * Utility for handling Gmail API rate limits and retries with exponential backoff
 */

// Constants for backoff configuration
const INITIAL_DELAY_MS = 1000;
const MAX_RETRIES = 20;
const MAX_DELAY_MS = 4000;

interface BackoffOptions {
  initialDelayMs?: number;
  maxRetries?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Executes a function with exponential backoff retry logic
 * 
 * @param fn - The async function to execute with retries
 * @param options - Configuration options for the backoff behavior
 * @returns The result of the function if successful
 * @throws The last error encountered if all retries fail
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  options: BackoffOptions = {}
): Promise<T> {
  const {
    initialDelayMs = INITIAL_DELAY_MS,
    maxRetries = MAX_RETRIES,
    maxDelayMs = MAX_DELAY_MS,
    onRetry
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      // If we've used all retries, throw the error
      if (attempt > maxRetries) {
        throw error;
      }

      // Only retry on rate limits (429), forbidden (403), or server errors (5xx)
      if (error instanceof Error) {
        const status = (error as any).status || (error as any).code;
        if (status !== 429 && status !== 403 && (status < 500 || status > 599)) {
          throw error;
        }
      }

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * 2, maxDelayMs);

      // Notify caller of retry if callback provided
      if (onRetry) {
        onRetry(attempt, error as Error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // TypeScript needs this, but it should never be reached
  throw new Error('Unexpected end of backoff loop');
} 