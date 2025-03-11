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
  status: 'idle' | 'processing' | 'completed' | 'error';
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
  onProgress: (progress: ProcessingProgress) => void
): Promise<SenderSummary> {
  const senderSummary: SenderSummary = {};
  let processedCount = 0;
  let pageToken: string | undefined = undefined;
  let totalMessages: number | null = null;
  
  try {
    onProgress({ processed: 0, total: null, status: 'processing' });
    
    // Keep fetching batches until we've processed all messages
    do {
      // Fetch a batch of message IDs
      const { messages, nextPageToken } = await fetchMessageIds(accessToken, options, pageToken);
      pageToken = nextPageToken;
      
      // If no messages found, break out of the loop
      if (!messages || messages.length === 0) {
        break;
      }
      
      // Extract just the IDs
      const messageIds = messages.map(msg => msg.id);
      
      // Fetch metadata for this batch
      const messagesMetadata = await fetchEmailMetadata(accessToken, messageIds);
      
      // Process each message
      for (const message of messagesMetadata) {
        const { email, name } = extractSenderInfo(message.payload.headers);
        
        // Update sender summary
        if (senderSummary[email]) {
          senderSummary[email].count++;
        } else {
          senderSummary[email] = {
            count: 1,
            name: name
          };
        }
        
        processedCount++;
        
        // Update progress every 10 messages
        if (processedCount % 10 === 0) {
          onProgress({ 
            processed: processedCount, 
            total: totalMessages, 
            status: 'processing' 
          });
        }
      }
      
      // Update progress after each batch
      onProgress({ 
        processed: processedCount, 
        total: totalMessages, 
        status: pageToken ? 'processing' : 'completed' 
      });
      
    } while (pageToken);
    
    // Final progress update
    onProgress({ 
      processed: processedCount, 
      total: processedCount, 
      status: 'completed' 
    });
    
    return senderSummary;
  } catch (error) {
    console.error('Error processing emails:', error);
    onProgress({ 
      processed: processedCount, 
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