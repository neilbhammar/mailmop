import { GmailMessageMetadata, ENABLE_GMAIL_DEBUG } from './fetchMetadata';

interface ParsedSender {
  email: string;
  name: string;
  date: string;
  hasUnsubscribe: boolean;
  isUnread: boolean;
  unsubscribe?: {
    mailto?: string;
    url?: string;
    requiresPost?: boolean;
  };
  subject?: string;
  messageId: string;
  isDateFromFallback?: boolean;
}

/**
 * Extracts sender information from Gmail message headers
 * 
 * @param metadata - Gmail message metadata object
 * @returns Parsed sender information
 */
export function parseHeaders(metadata: GmailMessageMetadata): ParsedSender {
  if (ENABLE_GMAIL_DEBUG) {
    console.log(`[Gmail Debug] Starting header parse for message ${metadata.id}`);
    
    // Validate input structure
    if (!metadata.payload) {
      console.error('[Gmail Debug] Missing payload:', metadata);
      throw new Error(`Missing payload for message ${metadata.id}`);
    }
    
    if (!Array.isArray(metadata.payload.headers)) {
      console.error('[Gmail Debug] Invalid headers structure:', metadata.payload);
      throw new Error(`Invalid headers structure for message ${metadata.id}`);
    }
  }

  const headers = metadata.payload?.headers || [];
  const result: ParsedSender = {
    email: '',
    name: '',
    date: '',
    hasUnsubscribe: false,
    isUnread: metadata.labelIds?.includes('UNREAD') || false,
    messageId: metadata.id
  };

  // Helper to find header value
  const getHeader = (name: string): string | undefined => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    if (ENABLE_GMAIL_DEBUG && !header) {
      console.warn(`[Gmail Debug] Header '${name}' not found for message ${metadata.id}`);
    }
    return header?.value;
  };

  // Parse From header
  const fromHeader = getHeader('From');
  if (!fromHeader) {
    if (ENABLE_GMAIL_DEBUG) {
      console.error('[Gmail Debug] Missing From header:', { id: metadata.id, headers });
    }
    throw new Error(`Missing From header for message ${metadata.id}`);
  }

  const fromMatch = fromHeader.match(/(?:"?([^"]*)"?\s)?(?:<)?([^>]+)(?:>)?/);
  if (fromMatch) {
    result.name = fromMatch[1]?.trim() || '';
    result.email = fromMatch[2]?.trim().toLowerCase() || '';
  } else {
    if (ENABLE_GMAIL_DEBUG) {
      console.error('[Gmail Debug] Could not parse From header:', { id: metadata.id, fromHeader });
    }
    throw new Error(`Could not parse From header for message ${metadata.id}: ${fromHeader}`);
  }

  // Parse Date
  const dateHeader = getHeader('Date');
  if (!dateHeader) {
    if (metadata.internalDate) {
      // Use internalDate as fallback (it's a timestamp in milliseconds)
      result.date = new Date(parseInt(metadata.internalDate)).toISOString();
      result.isDateFromFallback = true;
      if (ENABLE_GMAIL_DEBUG) {
        console.warn(`[Gmail Debug] Missing Date header for message ${metadata.id}, using internalDate: ${result.date}`);
      }
    } else {
      // Last resort: use current date but mark it
      result.date = new Date().toISOString();
      result.isDateFromFallback = true;
      if (ENABLE_GMAIL_DEBUG) {
        console.warn(`[Gmail Debug] Missing both Date header and internalDate for message ${metadata.id}, using current date`);
      }
    }
  } else {
    result.date = dateHeader;
    result.isDateFromFallback = false;
  }

  // Parse Subject (optional)
  const subject = getHeader('Subject');
  if (subject) {
    result.subject = subject;
  }

  // Parse List-Unsubscribe
  const unsubscribe = getHeader('List-Unsubscribe');
  if (unsubscribe) {
    result.hasUnsubscribe = true;
    result.unsubscribe = {};

    // Parse mailto: links
    const mailtoMatch = unsubscribe.match(/mailto:([^\s,>]+)/);
    if (mailtoMatch) {
      result.unsubscribe.mailto = mailtoMatch[1];
    }

    // Parse HTTP(S) links
    const urlMatch = unsubscribe.match(/https?:\/\/[^\s,>]+/);
    if (urlMatch) {
      result.unsubscribe.url = urlMatch[0];
    }

    // Check if POST is required
    result.unsubscribe.requiresPost = unsubscribe.includes('POST');
  }

  if (ENABLE_GMAIL_DEBUG) {
    console.log(`[Gmail Debug] Successfully parsed headers for message ${metadata.id}:`, {
      email: result.email,
      name: result.name,
      hasUnsubscribe: result.hasUnsubscribe,
      headers: headers.map(h => h.name) // Log available headers
    });
  }

  return result;
}

/**
 * Processes an array of metadata objects into parsed sender information
 */
export function parseMetadataBatch(batch: GmailMessageMetadata[]): ParsedSender[] {
  if (ENABLE_GMAIL_DEBUG) {
    console.log(`[Gmail Debug] Starting header parse for batch of ${batch.length} messages`);
  }

  // Process each message, catching errors individually
  const results: ParsedSender[] = [];
  
  for (const metadata of batch) {
    try {
      const result = parseHeaders(metadata);
      results.push(result);
    } catch (error) {
      console.error(`[Gmail Debug] Failed to parse headers for message ${metadata.id}:`, error);
      // Continue processing other messages
    }
  }

  if (ENABLE_GMAIL_DEBUG) {
    console.log(`[Gmail Debug] Successfully parsed ${results.length}/${batch.length} message headers`);
    if (results.length < batch.length) {
      console.warn(`[Gmail Debug] Failed to parse ${batch.length - results.length} messages`);
    }
  }

  return results;
} 