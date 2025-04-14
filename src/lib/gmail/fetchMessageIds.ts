import { withBackoff } from './backoff';
import { ENABLE_GMAIL_DEBUG } from './fetchMetadata';

interface MessageListResponse {
  messages?: { id: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/**
 * Fetches a batch of message IDs from Gmail based on a search query
 * 
 * @param accessToken - Gmail OAuth access token
 * @param query - Gmail search query (e.g., 'in:inbox')
 * @param pageToken - Token for fetching the next page of results
 * @returns Object containing message IDs and next page token
 */
export async function fetchMessageIds(
  accessToken: string,
  query: string,
  pageToken?: string
): Promise<{ messageIds: string[]; nextPageToken?: string }> {
  if (ENABLE_GMAIL_DEBUG) {
    console.log(`[Gmail Debug] Fetching message IDs with query: ${query}${pageToken ? ' (with page token)' : ''}`);
  }

  // Build request URL with query and pagination
  const url = new URL('https://www.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.append('q', query);
  url.searchParams.append('maxResults', '45'); // Batch size of 45
  if (pageToken) {
    url.searchParams.append('pageToken', pageToken);
  }

  // Make request with backoff retry logic
  const response = await withBackoff(async () => {
    if (ENABLE_GMAIL_DEBUG) {
      console.log(`[Gmail Debug] Making request to: ${url.toString()}`);
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const error = new Error('Failed to fetch message IDs') as any;
      error.status = res.status;
      throw error;
    }

    const data = await res.json();

    if (ENABLE_GMAIL_DEBUG) {
      console.log('[Gmail Debug] Message list response:', JSON.stringify(data, null, 2));
    }

    // Validate response structure
    if (!data.messages && !data.resultSizeEstimate) {
      console.error('[Gmail Debug] Invalid response structure:', data);
      throw new Error('Invalid response structure from Gmail API');
    }

    return data as MessageListResponse;
  }, {
    onRetry: (attempt, error) => {
      if (ENABLE_GMAIL_DEBUG) {
        console.warn(`[Gmail Debug] Retrying message ID fetch (attempt ${attempt}):`, error);
      }
    }
  });

  const messageIds = response.messages?.map(msg => msg.id) || [];

  if (ENABLE_GMAIL_DEBUG) {
    if (messageIds.length === 0) {
      console.warn('[Gmail Debug] No message IDs returned for query:', query);
    } else {
      console.log(`[Gmail Debug] Successfully fetched ${messageIds.length} message IDs${response.nextPageToken ? ' with next page token' : ''}`);
      console.log('[Gmail Debug] First few message IDs:', messageIds.slice(0, 3));
    }
  }

  // Extract and return message IDs with next page token
  return {
    messageIds,
    nextPageToken: response.nextPageToken
  };
} 