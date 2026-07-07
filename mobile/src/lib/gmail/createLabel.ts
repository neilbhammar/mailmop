import { withBackoff } from './backoff';
import { CreateLabelRequest, GmailLabel } from '@/types/gmail';
import { fetchAndStoreLabels } from './fetchLabels';

// Enable/disable detailed logging
export const ENABLE_LABEL_DEBUG = false;

/**
 * Creates a new label in Gmail
 * 
 * @param accessToken - Gmail OAuth access token
 * @param labelRequest - Label creation request parameters
 * @returns The created Gmail label or null if the label already exists
 */
export async function createLabel(
  accessToken: string,
  labelRequest: CreateLabelRequest
): Promise<GmailLabel | null> {
  if (ENABLE_LABEL_DEBUG) {
    console.log(`[Gmail] Creating new label: ${labelRequest.name}`);
  }

  return withBackoff(async () => {
    const url = 'https://www.googleapis.com/gmail/v1/users/me/labels';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(labelRequest),
    });

    if (!response.ok) {
      // If we get a 409, it means the label already exists
      if (response.status === 409) {
        console.warn(`[Gmail] Label "${labelRequest.name}" already exists`);
        // Return null to indicate the label already exists
        return null;
      }
      
      const error = new Error(`Failed to create label: ${await response.text()}`) as any;
      error.status = response.status;
      throw error;
    }

    const createdLabel = await response.json() as GmailLabel;
    
    if (ENABLE_LABEL_DEBUG) {
      console.log(`[Gmail] Successfully created label: ${createdLabel.name} (${createdLabel.id})`);
    }

    // Update labels in localStorage
    try {
      await fetchAndStoreLabels(accessToken);
    } catch (error) {
      console.error('[Gmail] Failed to update stored labels after creation:', error);
    }

    return createdLabel;
  }, {
    onRetry: (attempt, error) => {
      if (ENABLE_LABEL_DEBUG) {
        console.warn(`[Gmail] Retrying label creation (attempt ${attempt}):`, error);
      }
    }
  });
}

/**
 * Creates a new label with default settings
 * 
 * @param accessToken - Gmail OAuth access token
 * @param name - Name of the label to create
 * @returns The created Gmail label or null if it already exists
 */
export async function createSimpleLabel(
  accessToken: string,
  name: string
): Promise<GmailLabel | null> {
  return createLabel(accessToken, { 
    name,
    messageListVisibility: 'show',
    labelListVisibility: 'labelShow',
  });
}

/**
 * Creates a new label with a custom color
 * 
 * @param accessToken - Gmail OAuth access token
 * @param name - Name of the label to create
 * @param backgroundColor - Background color in hex format (e.g., '#f2f2f2')
 * @param textColor - Text color in hex format (e.g., '#000000')
 * @returns The created Gmail label or null if it already exists
 */
export async function createColoredLabel(
  accessToken: string,
  name: string,
  backgroundColor: string,
  textColor: string
): Promise<GmailLabel | null> {
  return createLabel(accessToken, {
    name,
    messageListVisibility: 'show',
    labelListVisibility: 'labelShow',
    color: {
      backgroundColor,
      textColor,
    }
  });
}

/**
 * Creates multiple labels at once
 * 
 * @param accessToken - Gmail OAuth access token
 * @param labelNames - Array of label names to create
 * @returns Array of created Gmail labels (may contain null for labels that already existed)
 */
export async function createMultipleLabels(
  accessToken: string,
  labelNames: string[]
): Promise<(GmailLabel | null)[]> {
  if (ENABLE_LABEL_DEBUG) {
    console.log(`[Gmail] Creating ${labelNames.length} labels`);
  }
  
  // Create labels sequentially to avoid rate limiting
  const results: (GmailLabel | null)[] = [];
  
  for (const name of labelNames) {
    try {
      const label = await createSimpleLabel(accessToken, name);
      results.push(label);
    } catch (error) {
      console.error(`[Gmail] Failed to create label "${name}":`, error);
      results.push(null);
    }
  }
  
  return results;
} 