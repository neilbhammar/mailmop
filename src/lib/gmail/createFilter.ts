/**
 * createFilter.ts
 * 
 * Helper function to create Gmail filters for automatically applying/removing labels
 * for specific senders using the Gmail API.
 */

// --- Types ---
interface CreateFilterResponse {
  success: boolean;
  filterId?: string;
  error?: string;
}

interface FilterOptions {
  senderEmails: string[];
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

/**
 * Creates a Gmail filter for multiple senders to automatically apply/remove labels
 * @param accessToken - Gmail API access token
 * @param options - Filter configuration options
 * @returns Success status, filter ID (if created), and any error message
 */
export async function createFilter(
  accessToken: string,
  options: FilterOptions
): Promise<CreateFilterResponse> {
  if (!options.senderEmails?.length || (!options.addLabelIds?.length && !options.removeLabelIds?.length)) {
    return {
      success: false,
      error: 'Invalid filter options: requires sender emails and at least one label action',
    };
  }

  try {
    // Combine multiple senders with OR operator
    const fromQuery = options.senderEmails.join(' OR ');

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/settings/filters',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          criteria: {
            from: fromQuery,
          },
          action: {
            addLabelIds: options.addLabelIds || [],
            removeLabelIds: options.removeLabelIds || [],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create filter: ${response.statusText}. ${
          errorData.error?.message || ''
        }`
      );
    }

    const data = await response.json();
    return {
      success: true,
      filterId: data.id,
    };
  } catch (error: any) {
    console.error('[createFilter] Failed:', error.message);
    return {
      success: false,
      error: `Failed to create filter: ${error.message}`,
    };
  }
}

/**
 * Creates a Gmail filter for multiple senders
 * @param accessToken - Gmail API access token
 * @param senders - Array of sender emails
 * @param options - Label IDs to add or remove
 * @returns Filter creation result
 */
export async function createFiltersForSenders(
  accessToken: string,
  senders: string[],
  options: Omit<FilterOptions, 'senderEmails'>
): Promise<CreateFilterResponse> {
  // Create a single filter for all senders
  return createFilter(accessToken, {
    senderEmails: senders,
    addLabelIds: options.addLabelIds,
    removeLabelIds: options.removeLabelIds,
  });
} 