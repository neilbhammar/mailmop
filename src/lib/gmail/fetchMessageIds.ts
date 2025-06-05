import { withBackoff } from './backoff';
import { ENABLE_GMAIL_DEBUG } from './fetchMetadata';
import { logger } from '@/lib/utils/logger';

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
 * @param maxResults - Maximum number of results to return (default: 45, max: 1000)
 * @returns Object containing message IDs and next page token
 */
export async function fetchMessageIds(
  accessToken: string,
  query: string,
  pageToken?: string,
  maxResults: number = 45 // Default to 45, allow override
): Promise<{ messageIds: string[]; nextPageToken?: string }> {
  if (ENABLE_GMAIL_DEBUG) {
    logger.debug('Fetching message IDs with query', { 
      component: 'fetchMessageIds', 
      hasPageToken: !!pageToken 
    });
  }

  // Build request URL with query and pagination
  const url = new URL('https://www.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.append('q', query);
  // Use the provided maxResults, ensuring it's within reasonable bounds (e.g., 1-1000)
  const effectiveMaxResults = Math.max(1, Math.min(1000, maxResults));
  url.searchParams.append('maxResults', effectiveMaxResults.toString());
  if (pageToken) {
    url.searchParams.append('pageToken', pageToken);
  }

  // Make request with backoff retry logic
  const response = await withBackoff(async () => {
    if (ENABLE_GMAIL_DEBUG) {
      logger.debug('Making Gmail API request', { component: 'fetchMessageIds' });
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
      logger.debug('Message list response received', { 
        component: 'fetchMessageIds',
        hasMessages: !!data.messages,
        resultSizeEstimate: data.resultSizeEstimate
      });
    }

    // Validate response structure
    // A valid response can have messages, or just resultSizeEstimate (often 0 if no messages found)
    if (typeof data.resultSizeEstimate === 'undefined' && !data.messages) {
      logger.error('Invalid response structure (missing messages and resultSizeEstimate)', { 
        component: 'fetchMessageIds',
        responseKeys: Object.keys(data)
      });
      throw new Error('Invalid response structure from Gmail API');
    }
    
    // If messages array is missing BUT resultSizeEstimate is 0, it's a valid "no messages" response.
    if (!data.messages && data.resultSizeEstimate === 0) {
      if (ENABLE_GMAIL_DEBUG) {
         logger.debug('Received resultSizeEstimate: 0 and no messages array. Treating as 0 results', { 
           component: 'fetchMessageIds' 
         });
      }
      return { messages: [], nextPageToken: undefined }; // Return empty results
    }

    // If we have messages or resultSizeEstimate > 0, proceed as normal
    return data as MessageListResponse;
  }, {
    onRetry: (attempt, error) => {
      if (ENABLE_GMAIL_DEBUG) {
        logger.warn('Retrying message ID fetch', { 
          component: 'fetchMessageIds',
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  const messageIds = response.messages?.map(msg => msg.id) || [];

  if (ENABLE_GMAIL_DEBUG) {
    if (messageIds.length === 0) {
      logger.warn('No message IDs returned for query', { component: 'fetchMessageIds' });
    } else {
      logger.debug('Successfully fetched message IDs', { 
        component: 'fetchMessageIds',
        count: messageIds.length,
        hasNextPageToken: !!response.nextPageToken
      });
      logger.debug('First few message IDs', { 
        component: 'fetchMessageIds',
        sampleIds: messageIds.slice(0, 3)
      });
    }
  }

  // Extract and return message IDs with next page token
  return {
    messageIds,
    nextPageToken: response.nextPageToken
  };
} 