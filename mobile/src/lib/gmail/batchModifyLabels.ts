/**
 * batchModifyLabels.ts
 * 
 * Helper function to modify labels for a batch of messages using the Gmail API.
 * Handles both adding and removing labels in batches of up to 1000 messages (Gmail API limit).
 */

// --- Constants ---
const BATCH_SIZE = 1000; // Gmail API maximum for batchModify
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// --- Types ---
interface BatchModifyResponse {
  success: boolean;
  error?: string;
}

interface BatchModifyOptions {
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

// --- Helper Functions ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Modifies labels for a batch of messages using the Gmail API
 * @param accessToken - Gmail API access token
 * @param messageIds - Array of message IDs to modify
 * @param options - Label IDs to add or remove
 * @returns Success status and any error message
 */
export async function batchModifyLabels(
  accessToken: string,
  messageIds: string[],
  options: BatchModifyOptions
): Promise<BatchModifyResponse> {
  if (!messageIds.length || (!options.addLabelIds?.length && !options.removeLabelIds?.length)) {
    return { success: true };
  }

  // Process in batches of BATCH_SIZE
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids: messageIds,
            addLabelIds: options.addLabelIds || [],
            removeLabelIds: options.removeLabelIds || [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to modify labels: ${response.statusText}. ${
            errorData.error?.message || ''
          }`
        );
      }

      return { success: true };
    } catch (error: any) {
      console.error(
        `[batchModifyLabels] Attempt ${attempt + 1} failed:`,
        error.message
      );

      if (attempt === RETRY_ATTEMPTS - 1) {
        return {
          success: false,
          error: `Failed to modify labels after ${RETRY_ATTEMPTS} attempts: ${error.message}`,
        };
      }

      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt)); // Exponential backoff
    }
  }

  return {
    success: false,
    error: `Failed to modify labels after ${RETRY_ATTEMPTS} attempts`,
  };
}

/**
 * Processes message IDs in batches to modify their labels
 * @param accessToken - Gmail API access token
 * @param messageIds - Array of message IDs to modify
 * @param options - Label IDs to add or remove
 * @returns Array of failed batch indices
 */
export async function processBatchModifyLabels(
  accessToken: string,
  messageIds: string[],
  options: BatchModifyOptions
): Promise<number[]> {
  const failedBatches: number[] = [];

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    const result = await batchModifyLabels(accessToken, batch, options);
    if (!result.success) {
      console.error(
        `[processBatchModifyLabels] Batch ${batchIndex} failed:`,
        result.error
      );
      failedBatches.push(batchIndex);
    }
  }

  return failedBatches;
} 