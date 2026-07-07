/**
 * Fetches a complete Gmail message including body content for link parsing.
 * This extends beyond the metadata-only fetching used in analysis to get actual email content.
 */

export interface GmailMessageFull {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      attachmentId?: string;
      size: number;
      data?: string; // Base64 encoded
    };
    parts?: GmailMessagePart[];
  };
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers?: Array<{
    name: string;
    value: string;
  }>;
  body?: {
    attachmentId?: string;
    size: number;
    data?: string; // Base64 encoded
  };
  parts?: GmailMessagePart[];
}

export interface MessageContent {
  messageId: string;
  headers: Record<string, string>;
  htmlContent?: string;
  textContent?: string;
  hasHtml: boolean;
  hasText: boolean;
  listUnsubscribeHeader?: string;
}

/**
 * Fetches a complete Gmail message by ID, including body content
 * @param accessToken - Valid Gmail access token
 * @param messageId - Gmail message ID
 * @returns Complete message data
 */
export async function fetchFullMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessageFull> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch message ${messageId}: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Extracts readable content from a Gmail message, focusing on HTML for link parsing
 * @param message - Complete Gmail message
 * @returns Extracted content with headers and body text
 */
export function extractMessageContent(message: GmailMessageFull): MessageContent {
  // Extract headers into a convenient map
  const headers: Record<string, string> = {};
  message.payload.headers?.forEach(header => {
    headers[header.name.toLowerCase()] = header.value;
  });

  const result: MessageContent = {
    messageId: message.id,
    headers,
    hasHtml: false,
    hasText: false,
    listUnsubscribeHeader: headers['list-unsubscribe'],
  };

  // Recursively extract HTML and text content from message parts
  function extractContent(part: GmailMessagePart | typeof message.payload, isRoot = false): void {
    // Handle direct body content (for simple messages)
    if (part.body?.data && (isRoot || part.mimeType === 'text/html' || part.mimeType === 'text/plain')) {
      const content = decodeBase64(part.body.data);
      
      if (part.mimeType === 'text/html') {
        result.htmlContent = content;
        result.hasHtml = true;
      } else if (part.mimeType === 'text/plain') {
        result.textContent = content;
        result.hasText = true;
      }
    }

    // Recursively process parts (for multipart messages)
    if (part.parts) {
      for (const subPart of part.parts) {
        // Skip attachments and focus on content
        if (!subPart.filename) {
          extractContent(subPart);
        }
      }
    }
  }

  // Start extraction from the root payload
  extractContent(message.payload, true);

  return result;
}

/**
 * Decodes base64 content from Gmail API
 * Gmail uses URL-safe base64 encoding
 */
function decodeBase64(data: string): string {
  try {
    // Gmail uses URL-safe base64, convert to standard base64
    const standardBase64 = data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const padded = standardBase64 + '='.repeat((4 - standardBase64.length % 4) % 4);
    
    // Decode and convert to string
    return decodeURIComponent(escape(atob(padded)));
  } catch (error) {
    console.error('Failed to decode base64 content:', error);
    return '';
  }
}

/**
 * Quick helper to fetch and extract content in one call
 * @param accessToken - Valid Gmail access token  
 * @param messageId - Gmail message ID
 * @returns Extracted message content ready for parsing
 */
export async function fetchMessageContent(
  accessToken: string,
  messageId: string
): Promise<MessageContent> {
  const message = await fetchFullMessage(accessToken, messageId);
  return extractMessageContent(message);
} 