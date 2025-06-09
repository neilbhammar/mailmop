/**
 * Link parser for extracting unsubscribe URLs from email body content.
 * Uses priority-based rules with confidence scoring to find the best unsubscribe link.
 */

export interface ParsedLink {
  url: string;
  confidence: number; // 0-1 scale
  source: string; // Which rule matched
  linkText?: string; // The visible text of the link
  isHttps: boolean;
  isValidDomain: boolean;
}

export interface ParseResult {
  success: boolean;
  bestLink?: ParsedLink;
  allLinks: ParsedLink[];
  error?: string;
}

// Priority-based rules (highest to lowest priority)
const UNSUBSCRIBE_PATTERNS = [
  {
    name: 'unsubscribe',
    regex: /(?:href\s*=\s*["']([^"']*unsubscribe[^"']*)["']|<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>\s*[^<]*unsubscribe[^<]*<\/a>)/gi,
    confidence: 0.95,
    priority: 1
  },
  {
    name: 'unsubscribe_exact',
    regex: /href\s*=\s*["']([^"']*unsubscribe[^"']*)["'][^>]*>\s*unsubscribe\s*<\/a>/gi,
    confidence: 0.98,
    priority: 0 // Highest priority
  },
  {
    name: 'manage_preferences',
    regex: /(?:href\s*=\s*["']([^"']*(?:manage[^"']*preferences|preferences)[^"']*)["']|<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>\s*[^<]*(?:manage\s+preferences|email\s+preferences)[^<]*<\/a>)/gi,
    confidence: 0.85,
    priority: 2
  },
  {
    name: 'opt_out',
    regex: /(?:href\s*=\s*["']([^"']*opt[\-_\s]*out[^"']*)["']|<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>\s*[^<]*opt[\-_\s]*out[^<]*<\/a>)/gi,
    confidence: 0.80,
    priority: 3
  },
  {
    name: 'remove_me',
    regex: /(?:href\s*=\s*["']([^"']*(?:remove|unlist)[^"']*)["']|<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>\s*[^<]*(?:remove\s+me|unlist\s+me|remove\s+from\s+list)[^<]*<\/a>)/gi,
    confidence: 0.75,
    priority: 4
  },
  {
    name: 'email_settings',
    regex: /(?:href\s*=\s*["']([^"']*(?:email[^"']*settings|notification[^"']*settings)[^"']*)["']|<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>\s*[^<]*(?:email\s+settings|notification\s+settings)[^<]*<\/a>)/gi,
    confidence: 0.70,
    priority: 5
  },
  {
    name: 'stop_emails',
    regex: /(?:href\s*=\s*["']([^"']*stop[^"']*)["']|<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>\s*[^<]*(?:stop\s+emails|stop\s+receiving)[^<]*<\/a>)/gi,
    confidence: 0.65,
    priority: 6
  }
];

/**
 * Main function to parse HTML content and extract the best unsubscribe link
 * @param htmlContent - Email HTML content
 * @param messageId - Message ID for debugging
 * @returns Parse result with best link and confidence
 */
export function parseUnsubscribeLinks(
  htmlContent: string,
  messageId?: string
): ParseResult {
  if (!htmlContent || htmlContent.trim().length === 0) {
    return {
      success: false,
      allLinks: [],
      error: 'No HTML content provided'
    };
  }

  try {
    const allLinks: ParsedLink[] = [];

    // Apply each pattern to find potential unsubscribe links
    for (const pattern of UNSUBSCRIBE_PATTERNS) {
      const matches = findMatches(htmlContent, pattern);
      allLinks.push(...matches);
    }

    if (allLinks.length === 0) {
      return {
        success: false,
        allLinks: [],
        error: 'No unsubscribe links found'
      };
    }

    // Sort by priority (lower number = higher priority) and then by confidence
    allLinks.sort((a, b) => {
      const patternA = UNSUBSCRIBE_PATTERNS.find(p => p.name === a.source);
      const patternB = UNSUBSCRIBE_PATTERNS.find(p => p.name === b.source);
      
      const priorityA = patternA?.priority ?? 999;
      const priorityB = patternB?.priority ?? 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower priority number = higher priority
      }
      
      return b.confidence - a.confidence; // Higher confidence first
    });

    // Remove duplicates (same URL)
    const uniqueLinks = removeDuplicates(allLinks);

    return {
      success: true,
      bestLink: uniqueLinks[0],
      allLinks: uniqueLinks,
    };

  } catch (error) {
    return {
      success: false,
      allLinks: [],
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

/**
 * Clean and normalize URLs
 */
function cleanUrl(url: string): string {
  // Remove HTML entities
  let cleaned = url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Trim whitespace
  cleaned = cleaned.trim();

  // Ensure it starts with http/https
  if (cleaned.match(/^\/\//)) {
    cleaned = 'https:' + cleaned;
  } else if (!cleaned.match(/^https?:\/\//)) {
    if (cleaned.includes('.')) {
      cleaned = 'https://' + cleaned;
    } else {
      return ''; // Not a valid URL
    }
  }

  return cleaned;
}

/**
 * Basic URL validation
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate domain (basic check for suspicious domains)
 */
function isValidDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();
    
    // Basic domain validation
    if (domain.length < 3) return false;
    if (!domain.includes('.')) return false;
    
    // Suspicious patterns (could be expanded)
    const suspiciousPatterns = [
      /bit\.ly/,
      /tinyurl/,
      /t\.co/,
      /localhost/,
      /127\.0\.0\.1/,
      /\d+\.\d+\.\d+\.\d+/ // Raw IP addresses
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(domain));
  } catch {
    return false;
  }
}

/**
 * Extract visible link text (simplified)
 */
function extractLinkText(htmlContent: string, url: string): string | undefined {
  // Simple regex to find the link text - could be improved
  const linkRegex = new RegExp(`<a[^>]*href\\s*=\\s*["']${escapeRegex(url)}["'][^>]*>([^<]*)</a>`, 'i');
  const match = linkRegex.exec(htmlContent);
  
  if (match && match[1]) {
    return match[1].trim().replace(/\s+/g, ' ');
  }
  
  return undefined;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Adjust confidence based on URL and link text characteristics
 */
function adjustConfidence(url: string, linkText: string | undefined, baseConfidence: number): number {
  let adjustment = 0;

  // HTTPS bonus
  if (url.startsWith('https://')) {
    adjustment += 0.05;
  }

  // Link text quality bonus
  if (linkText) {
    const lowerText = linkText.toLowerCase();
    if (lowerText.includes('unsubscribe')) {
      adjustment += 0.1;
    } else if (lowerText.includes('preferences') || lowerText.includes('settings')) {
      adjustment += 0.05;
    }
    
    // Penalty for suspicious text
    if (lowerText.includes('click here') || lowerText.includes('here')) {
      adjustment -= 0.1;
    }
  }

  // Domain reputation (basic implementation)
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.includes('unsubscribe') || domain.includes('preferences')) {
      adjustment += 0.05;
    }
  } catch {
    // Invalid URL, penalty
    adjustment -= 0.2;
  }

  // Ensure confidence stays within bounds
  return Math.max(0, Math.min(1, baseConfidence + adjustment));
}

/**
 * Remove duplicate URLs, keeping the highest confidence one
 */
function removeDuplicates(links: ParsedLink[]): ParsedLink[] {
  const urlMap = new Map<string, ParsedLink>();

  for (const link of links) {
    const existing = urlMap.get(link.url);
    if (!existing || link.confidence > existing.confidence) {
      urlMap.set(link.url, link);
    }
  }

  return Array.from(urlMap.values());
}

/**
 * Find matches for a specific pattern in HTML content
 */
function findMatches(htmlContent: string, pattern: typeof UNSUBSCRIBE_PATTERNS[0]): ParsedLink[] {
  const matches: ParsedLink[] = [];
  let match;

  // Reset regex state
  pattern.regex.lastIndex = 0;

  while ((match = pattern.regex.exec(htmlContent)) !== null) {
    // Extract URL from capture groups (handle multiple capture group patterns)
    const url = match[1] || match[2];
    
    if (!url) continue;

    // Clean and validate the URL
    const cleanedUrl = cleanUrl(url);
    if (!cleanedUrl || !isValidUrl(cleanedUrl)) continue;

    // Extract link text if available (basic implementation)
    const linkText = extractLinkText(htmlContent, cleanedUrl);

    // Calculate final confidence score
    const baseConfidence = pattern.confidence;
    const adjustedConfidence = adjustConfidence(cleanedUrl, linkText, baseConfidence);

    matches.push({
      url: cleanedUrl,
      confidence: adjustedConfidence,
      source: pattern.name,
      linkText,
      isHttps: cleanedUrl.startsWith('https://'),
      isValidDomain: isValidDomain(cleanedUrl)
    });
  }

  return matches;
}

/**
 * Helper function to validate parser results and provide debugging info
 */
export function validateParseResult(result: ParseResult): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!result.success) {
    issues.push(result.error || 'Parse failed');
    recommendations.push('Check HTML content format and try again');
    return { isValid: false, issues, recommendations };
  }

  if (!result.bestLink) {
    issues.push('No best link found despite successful parse');
    return { isValid: false, issues, recommendations };
  }

  // Confidence threshold check
  if (result.bestLink.confidence < 0.5) {
    issues.push(`Low confidence score: ${result.bestLink.confidence.toFixed(2)}`);
    recommendations.push('Consider manual verification');
  }

  // HTTPS check
  if (!result.bestLink.isHttps) {
    issues.push('Link uses HTTP instead of HTTPS');
    recommendations.push('Verify link security before using');
  }

  // Domain validation
  if (!result.bestLink.isValidDomain) {
    issues.push('Suspicious or invalid domain detected');
    recommendations.push('Manually verify domain before proceeding');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
} 