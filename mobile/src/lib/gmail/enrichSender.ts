/**
 * Enriches a sender's unsubscribe data by fetching and parsing their most recent email.
 * Used for on-demand enrichment when users click unsubscribe.
 */

import { fetchFullMessage, extractMessageContent } from './fetchFullMessage';
import { parseUnsubscribeLinks, ParsedLink } from './linkParser';
import { logger } from '@/lib/utils/logger';

export interface EnrichmentResult {
  enrichedUrl: string | null;
  confidence: number;
  enrichedAt: number;
  error?: string;
}

/**
 * Attempts to enrich unsubscribe data for a sender using their most recent email
 * @param accessToken - Gmail OAuth access token
 * @param messageId - ID of the message to analyze (typically firstMessageId from analysis)
 * @returns Enrichment result with best URL found, confidence score, and timestamp
 */
export async function enrichSender(
  accessToken: string, 
  messageId: string
): Promise<EnrichmentResult> {
  logger.debug('Starting sender enrichment', {
    component: 'enrichSender',
    messageId
  });

  try {
    // Step 1: Fetch the complete email content
    logger.debug('Fetching full message content', {
      component: 'enrichSender',
      messageId
    });
    
    const fullMessage = await fetchFullMessage(accessToken, messageId);
    
    logger.debug('Successfully fetched message', {
      component: 'enrichSender',
      messageId,
      hasPayload: !!fullMessage.payload,
      snippet: fullMessage.snippet?.substring(0, 100)
    });

    // Step 2: Extract HTML content from the message
    const messageContent = extractMessageContent(fullMessage);
    
    logger.debug('Extracted message content', {
      component: 'enrichSender',
      messageId,
      hasHtml: messageContent.hasHtml,
      hasText: messageContent.hasText,
      listUnsubscribeHeader: !!messageContent.listUnsubscribeHeader
    });

    // Use HTML content if available, fallback to text content
    const contentToAnalyze = messageContent.htmlContent || messageContent.textContent || '';
    
    if (!contentToAnalyze) {
      logger.warn('No content available for parsing', {
        component: 'enrichSender',
        messageId
      });
      
      return {
        enrichedUrl: null,
        confidence: 0,
        enrichedAt: Date.now(),
        error: 'No email content available for parsing'
      };
    }

    // Step 3: Parse links from the email content
    logger.debug('Parsing links from email content', {
      component: 'enrichSender',
      messageId,
      contentLength: contentToAnalyze.length
    });

    const parseResult = parseUnsubscribeLinks(contentToAnalyze, messageId);

    if (!parseResult.success) {
      logger.warn('Link parsing failed', {
        component: 'enrichSender',
        messageId,
        error: parseResult.error
      });
      
      return {
        enrichedUrl: null,
        confidence: 0,
        enrichedAt: Date.now(),
        error: parseResult.error
      };
    }

    // Step 3: Find the best unsubscribe link
    const validLinks = parseResult.allLinks.filter((link: ParsedLink) => link.isValidDomain);
    
    if (validLinks.length === 0) {
      logger.debug('No valid unsubscribe links found', {
        component: 'enrichSender',
        messageId,
        totalLinksFound: parseResult.allLinks.length
      });
      
      return {
        enrichedUrl: null,
        confidence: 0,
        enrichedAt: Date.now(),
        error: 'No valid unsubscribe links found in email content'
      };
    }

    // Get the highest confidence link (bestLink from parseResult or first valid link)
    const bestLink = parseResult.bestLink || validLinks[0];
    
    logger.debug('Found best unsubscribe link', {
      component: 'enrichSender',
      messageId,
      url: bestLink.url,
      confidence: bestLink.confidence,
      linkText: bestLink.linkText?.substring(0, 50),
      totalValidLinks: validLinks.length
    });

    return {
      enrichedUrl: bestLink.url,
      confidence: bestLink.confidence,
      enrichedAt: Date.now()
    };

  } catch (error) {
    logger.error('Enrichment failed with error', {
      component: 'enrichSender',
      messageId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      enrichedUrl: null,
      confidence: 0,
      enrichedAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown enrichment error'
    };
  }
} 