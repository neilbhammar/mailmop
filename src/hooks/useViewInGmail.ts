import { useCallback } from 'react';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useAuth } from '@/context/AuthProvider';
import { toast } from 'sonner';

/**
 * Hook to handle the "View in Gmail" functionality
 * 
 * This hook provides functions to open Gmail search results for specific senders
 * in a new browser tab.
 * 
 * @returns Object containing functions to open Gmail searches
 */
export function useViewInGmail() {
  const { gmailEmail } = useGmailPermissions();
  const { user } = useAuth();
  
  // Get the user's email from either the Gmail permissions or Auth context
  const userEmail = gmailEmail || user?.email || '';
  
  /**
   * Open Gmail search for a specific sender in a new tab
   * @param email The sender's email address to search for
   */
  const viewSenderInGmail = useCallback((email: string) => {
    // Using the format from the user's example
    window.open(`https://mail.google.com/mail/u/${userEmail}/#search/from:${encodeURIComponent(email)}`, '_blank');
  }, [userEmail]);
  
  /**
   * Open Gmail search for multiple senders in a new tab
   * @param emails Array of sender email addresses to search for
   */
  const viewMultipleSendersInGmail = useCallback((emails: string[]) => {
    if (emails.length === 0) {
      toast.warning('No senders selected');
      return;
    }
    
    // Construct the Gmail search query with multiple "from:" operators combined with OR
    const searchQuery = emails.map(email => `from:${email}`).join(' OR ');
    
    // Using the format from the user's example
    window.open(`https://mail.google.com/mail/u/${userEmail}/#search/${encodeURIComponent(searchQuery)}`, '_blank');
  }, [userEmail]);
  
  return {
    viewSenderInGmail,
    viewMultipleSendersInGmail
  };
} 