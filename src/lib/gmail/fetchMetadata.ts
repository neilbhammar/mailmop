import { withBackoff } from './backoff';

// Enable/disable detailed logging
export const ENABLE_GMAIL_DEBUG = false;

// Constants for rate limiting
const PARALLEL_BATCH_SIZE = 15; // Process 5 messages in parallel
const BATCH_DELAY_MS = 20; // 20ms delay between batches

export interface GmailMessageMetadata {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: {
    partId?: string;
    mimeType?: string;
    filename?: string;
    headers?: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      size: number;
      data?: string;
    };
    parts?: Array<{
      partId: string;
      mimeType: string;
      filename: string;
      headers: Array<{
        name: string;
        value: string;
      }>;
      body: {
        size: number;
        data?: string;
      };
    }>;
  };
  sizeEstimate?: number;
}

/**
 * Adds a delay between API requests to avoid rate limiting
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Splits an array into chunks of specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetches metadata for a single message
 */
async function fetchSingleMetadata(
  accessToken: string,
  id: string
): Promise<GmailMessageMetadata> {
  return withBackoff(async () => {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${id}`;
    const params = new URLSearchParams({
      format: 'full',
      metadataHeaders: [
        'From',
        'Subject',
        'List-Unsubscribe',
        'Date'
      ].join(',')
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = new Error('Failed to fetch message metadata') as any;
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    
    if (!data.payload?.headers) {
      console.error(`[Gmail] Missing headers for message ${id}`);
      throw new Error(`Missing headers in response for message ${id}`);
    }

    return data as GmailMessageMetadata;
  }, {
    onRetry: (attempt, error) => {
      if (ENABLE_GMAIL_DEBUG) {
        console.warn(`[Gmail] Retrying message ${id} (attempt ${attempt})`);
      }
    }
  });
}

/**
 * Fetches metadata for a batch of Gmail messages using batched parallel processing
 * 
 * @param accessToken - Gmail OAuth access token
 * @param messageIds - Array of message IDs to fetch metadata for
 * @returns Array of message metadata objects
 */
export async function fetchMetadata(
  accessToken: string,
  messageIds: string[]
): Promise<GmailMessageMetadata[]> {
  if (ENABLE_GMAIL_DEBUG) {
    console.log(`[Gmail] Fetching metadata for ${messageIds.length} messages in batches of ${PARALLEL_BATCH_SIZE}...`);
  }

  const results: GmailMessageMetadata[] = [];
  const failures: string[] = [];

  // Split messages into smaller batches
  const batches = chunk(messageIds, PARALLEL_BATCH_SIZE);

  // Process each batch with parallel requests within the batch
  for (const [batchIndex, batch] of batches.entries()) {
    if (ENABLE_GMAIL_DEBUG) {
      console.log(`[Gmail] Processing batch ${batchIndex + 1}/${batches.length}...`);
    }

    // Add delay between batches (except first one)
    if (batchIndex > 0) {
      await delay(BATCH_DELAY_MS);
    }

    // Process this batch in parallel
    const batchPromises = batch.map(id => 
      fetchSingleMetadata(accessToken, id)
        .catch(error => {
          console.error(`[Gmail] Failed to fetch metadata for message ${id}:`, error);
          failures.push(id);
          return null;
        })
    );

    const batchResults = await Promise.all(batchPromises);
    
    // Add successful results to our array
    results.push(...batchResults.filter((r): r is GmailMessageMetadata => r !== null));

    if (ENABLE_GMAIL_DEBUG) {
      console.log(`[Gmail] Completed batch ${batchIndex + 1}: ${results.length}/${messageIds.length} total messages processed`);
    }
  }

  // Log summary
  if (failures.length > 0) {
    console.error(`[Gmail] Failed to fetch ${failures.length}/${messageIds.length} messages`);
  }

  if (ENABLE_GMAIL_DEBUG && results.length > 0) {
    console.log(`[Gmail] Successfully fetched ${results.length}/${messageIds.length} messages`);
  }

  // If we didn't get any successful results, throw an error
  if (results.length === 0) {
    throw new Error(`Failed to fetch metadata for all ${messageIds.length} messages`);
  }

  return results;
} 