// Placeholder for parseMailto.ts
// This utility will parse a mailto: string into an object: { to, subject?, body? }

/**
 * Parses a mailto: string into its components.
 * Example: mailto:foo@example.com?subject=Unsubscribe&body=Please%20remove%20me
 * Also handles input that might be missing the "mailto:" prefix.
 * @param mailtoInput The mailto string (potentially without the scheme).
 * @returns An object with to, subject, and body properties, or null if parsing fails.
 */
export function parseMailto(mailtoInput: string): {
  to: string | null;
  subject?: string;
  body?: string;
} | null {
  if (!mailtoInput) {
    return null;
  }

  // Ensure the input starts with mailto:
  const mailtoLink = mailtoInput.trim().startsWith("mailto:") 
    ? mailtoInput.trim() 
    : `mailto:${mailtoInput.trim()}`;

  try {
    // Use URL constructor for robust parsing of recipient and query params
    const url = new URL(mailtoLink);
    
    // The recipient is the pathname for mailto URLs
    const to = url.pathname || null; 

    if (!to) {
        console.warn("Could not extract recipient from mailto link:", mailtoLink);
        return null; // Cannot proceed without a recipient
    }

    let subject: string | undefined;
    let body: string | undefined;

    // URLSearchParams handles decoding
    if (url.searchParams.has("subject")) {
      subject = url.searchParams.get("subject") || undefined;
    }
    if (url.searchParams.has("body")) {
      body = url.searchParams.get("body") || undefined;
    }

    return { to, subject, body };

  } catch (error) {
    // Log the error but don't necessarily fail if it's a simple mailto without query params
    console.error("Error parsing mailto link using URL constructor:", mailtoLink, error);

    // Fallback: try simple parsing for cases like "mailto:address@example.com"
    // This handles cases where URL constructor might fail on simpler valid mailto links.
    if (mailtoLink.startsWith("mailto:") && !mailtoLink.includes("?") && !mailtoLink.includes("&")) {
        const toAddress = mailtoLink.substring("mailto:".length);
        // Basic validation: check for presence of '@'
        if (toAddress && toAddress.includes('@')) { 
            console.log("Parsed simple mailto using fallback:", toAddress);
            return { to: toAddress };
        } else {
            console.warn("Fallback parsing failed for simple mailto link:", mailtoLink);
        }
    }
    
    // If both URL constructor and fallback fail
    return null;
  }
} 