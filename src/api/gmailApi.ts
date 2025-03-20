/**
 * Browser-compatible Gmail API client
 */

// Interface for email counts
export interface EmailCounts {
  messages: number | null;
  threads: number | null;
  emailAddress?: string;
}

// Add this interface for Gmail labels
interface GmailLabel {
  id: string;
  name: string;
  type?: string;
  messagesTotal?: number;
  threadsTotal?: number;
}

// Interface for email sender summary
export interface SenderSummary {
  [email: string]: {
    count: number;
    name: string;
    unsubscribeLink?: string;
  };
}

// Interface for email processing options
export interface EmailProcessingOptions {
  excludeSentByMe: boolean;
  onlyUnsubscribe: boolean;
}

// Interface for email processing progress
export interface ProcessingProgress {
  processed: number;
  total: number | null;
  status: 'idle' | 'processing' | 'completed' | 'error' | 'stopping';
  error?: string;
}

// Function to get total email and thread counts using the profile endpoint
export async function getEmailCounts(accessToken: string): Promise<EmailCounts> {
  try {
    // Use the users.getProfile endpoint which gives us both message and thread counts
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const profileData = await response.json();
    console.log("Profile data:", profileData);
    
    return {
      messages: profileData.messagesTotal || 0,
      threads: profileData.threadsTotal || 0,
      emailAddress: profileData.emailAddress
    };
  } catch (error) {
    console.error('Error fetching email counts:', error);
    return {
      messages: null,
      threads: null
    };
  }
}

// Function to fetch emails using the Gmail API with the access token
export async function fetchEmails(accessToken: string) {
  try {
    // Use fetch API instead of googleapis library
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

// Function to get email details
export async function getEmailDetails(accessToken: string, messageId: string) {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching email details:', error);
    throw error;
  }
}

/**
 * Fetches message IDs in batches with the specified filters
 */
export async function fetchMessageIds(
  accessToken: string, 
  options: EmailProcessingOptions, 
  pageToken?: string
): Promise<{ messages: { id: string }[], nextPageToken?: string }> {
  try {
    // Build the query based on options
    let query = '';
    
    if (options.excludeSentByMe) {
      query += '-from:me ';
    }
    
    if (options.onlyUnsubscribe) {
      query += 'unsubscribe ';
    }
    
    // Trim any extra spaces
    query = query.trim();
    
    // Construct the URL with query parameters
    let url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100';
    
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }
    
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    
    console.log(`Fetching messages with query: ${query}`);
    
    try {
      const response = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if the error is related to scope limitations
        if (errorData?.error?.message?.includes("Metadata scope does not support 'q' parameter")) {
          console.warn("Using metadata scope which doesn't support filters. Fetching without filters.");
          
          // Try again without the query parameter
          let fallbackUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100';
          if (pageToken) {
            fallbackUrl += `&pageToken=${pageToken}`;
          }
          
          const fallbackResponse = await fetchWithRetry(fallbackUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!fallbackResponse.ok) {
            const fallbackErrorData = await fallbackResponse.json();
            throw new Error(`Gmail API error: ${fallbackResponse.status} - ${JSON.stringify(fallbackErrorData)}`);
          }
          
          const data = await fallbackResponse.json();
          return {
            messages: data.messages || [],
            nextPageToken: data.nextPageToken
          };
        }
        
        throw new Error(`Gmail API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return {
        messages: data.messages || [],
        nextPageToken: data.nextPageToken
      };
    } catch (error) {
      // If there's an error with the query parameter, try without it
      if (query && error instanceof Error && error.message.includes("Metadata scope does not support 'q' parameter")) {
        console.warn("Using metadata scope which doesn't support filters. Fetching without filters.");
        
        let fallbackUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100';
        if (pageToken) {
          fallbackUrl += `&pageToken=${pageToken}`;
        }
        
        const fallbackResponse = await fetchWithRetry(fallbackUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!fallbackResponse.ok) {
          const fallbackErrorData = await fallbackResponse.json();
          throw new Error(`Gmail API error: ${fallbackResponse.status} - ${JSON.stringify(fallbackErrorData)}`);
        }
        
        const data = await fallbackResponse.json();
        return {
          messages: data.messages || [],
          nextPageToken: data.nextPageToken
        };
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error fetching message IDs:', error);
    throw error;
  }
}

/**
 * Fetches email metadata for a batch of message IDs
 */
export async function fetchEmailMetadata(
  accessToken: string,
  messageIds: string[]
): Promise<any[]> {
  try {
    // Use Promise.all to fetch metadata for all messages in parallel
    const promises = messageIds.map(id => 
      fetchWithRetry(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Gmail API error: ${response.status}`);
        }
        return response.json();
      })
    );
    
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error fetching email metadata:', error);
    throw error;
  }
}

/**
 * Extracts sender information from email headers
 */
export function extractSenderInfo(headers: { name: string, value: string }[]): { email: string, name: string } {
  const fromHeader = headers.find(header => header.name === 'From');
  
  if (!fromHeader) {
    return { email: 'unknown@example.com', name: 'Unknown Sender' };
  }
  
  const fromValue = fromHeader.value;
  
  // Try to extract email and name using regex
  const emailMatch = fromValue.match(/<([^>]+)>/);
  const email = emailMatch ? emailMatch[1].toLowerCase() : fromValue.toLowerCase();
  
  // Extract name (everything before the email)
  let name = '';
  if (emailMatch && fromValue.indexOf('<') > 0) {
    name = fromValue.substring(0, fromValue.indexOf('<')).trim();
    // Remove quotes if present
    name = name.replace(/^"(.*)"$/, '$1');
  } else {
    name = email;
  }
  
  return { email, name };
}

/**
 * Utility function to fetch with retry logic for handling rate limits
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3, 
  initialDelay = 1000
): Promise<Response> {
  let retries = 0;
  let delay = initialDelay;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        retries++;
        console.log(`Rate limited. Retrying in ${delay}ms... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      
      console.log(`Network error. Retrying in ${delay}ms... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries`);
}

/**
 * Processes emails and builds a sender summary
 */
export async function processEmails(
  accessToken: string,
  options: EmailProcessingOptions,
  onProgress: (progress: ProcessingProgress) => void,
  processingOptions?: {
    batchSize?: number;
    delayBetweenBatches?: number;
    onBatchProcessed?: (batchSummary: SenderSummary) => void;
  }
): Promise<SenderSummary> {
  const senderSummary: SenderSummary = {};
  let nextPageToken: string | undefined;
  let totalProcessed = 0;
  let totalMessages: number | null = null;
  
  // Set default processing options
  const batchSize = processingOptions?.batchSize || 100; // Default to 100 messages per batch
  const delayBetweenBatches = processingOptions?.delayBetweenBatches || 0; // Default to no delay
  const onBatchProcessed = processingOptions?.onBatchProcessed;
  
  // Helper function to add delay between batches
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    onProgress({
      processed: 0,
      total: null,
      status: 'processing'
    });
    
    // First, get the total count of messages to process
    try {
      const counts = await getEmailCounts(accessToken);
      totalMessages = counts.messages;
    } catch (error) {
      console.warn("Could not get total message count:", error);
    }
    
    // Process messages in batches
    do {
      // Fetch a batch of message IDs
      const { messages, nextPageToken: newPageToken } = await fetchMessageIds(
        accessToken,
        options,
        nextPageToken
      );
      
      nextPageToken = newPageToken;
      
      if (!messages || messages.length === 0) {
        break;
      }
      
      // Process messages in smaller batches to avoid rate limiting
      for (let i = 0; i < messages.length; i += batchSize) {
        const batchMessages = messages.slice(i, i + batchSize);
        const batchIds = batchMessages.map(msg => msg.id);
        
        // Fetch metadata for this batch
        const emailsMetadata = await fetchEmailMetadata(accessToken, batchIds);
        
        // Create a batch summary to track just this batch's results
        const batchSummary: SenderSummary = {};
        
        // Process each email in the batch
        for (const metadata of emailsMetadata) {
          if (!metadata || !metadata.payload || !metadata.payload.headers) {
            continue;
          }
          
          const { email, name } = extractSenderInfo(metadata.payload.headers);
          
          if (email) {
            // Update the overall summary
            if (!senderSummary[email]) {
              senderSummary[email] = {
                count: 0,
                name: name || email
              };
            }
            senderSummary[email].count++;
            
            // Update the batch summary
            if (!batchSummary[email]) {
              batchSummary[email] = {
                count: 0,
                name: name || email
              };
            }
            batchSummary[email].count++;
          }
          
          totalProcessed++;
        }
        
        // Update progress
        onProgress({
          processed: totalProcessed,
          total: totalMessages,
          status: 'processing'
        });
        
        // Call the batch processed callback if provided
        if (onBatchProcessed && Object.keys(batchSummary).length > 0) {
          onBatchProcessed(batchSummary);
        }
        
        // Add delay between batches if specified
        if (delayBetweenBatches > 0 && i + batchSize < messages.length) {
          await delay(delayBetweenBatches);
        }
      }
      
      // Add delay between page fetches if specified
      if (delayBetweenBatches > 0 && nextPageToken) {
        await delay(delayBetweenBatches);
      }
      
    } while (nextPageToken);
    
    // Mark as completed
    onProgress({
      processed: totalProcessed,
      total: totalMessages,
      status: 'completed'
    });
    
    return senderSummary;
    
  } catch (error) {
    console.error("Error processing emails:", error);
    
    onProgress({
      processed: totalProcessed,
      total: totalMessages,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}

/**
 * Generates a CSV file from sender summary data
 */
export function generateCSV(senderSummary: SenderSummary): string {
  // Create CSV header
  let csv = 'Email,Name,Count\n';
  
  // Add each sender as a row
  Object.entries(senderSummary).forEach(([email, data]) => {
    // Escape quotes in the name
    const escapedName = data.name.replace(/"/g, '""');
    csv += `${email},"${escapedName}",${data.count}\n`;
  });
  
  return csv;
}

/**
 * Creates a download link for CSV data
 */
export function downloadCSV(csvData: string, filename = 'email-senders.csv'): void {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}