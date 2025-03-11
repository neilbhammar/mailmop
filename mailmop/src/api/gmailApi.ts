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