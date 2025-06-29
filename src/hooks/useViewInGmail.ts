import { useCallback } from 'react';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useAuth } from '@/context/AuthProvider';
import { toast } from 'sonner';
import { createActionLog } from '@/supabase/actions/logAction';
import { ActionType } from '@/types/actions';

/**
 * Hook to handle the "View in Gmail" and "Preview Filtered Emails" functionality
 * 
 * This hook provides functions to open Gmail search results for specific senders
 * or complex filter queries in a new browser tab and logs these actions to Supabase.
 * It will use the Supabase authenticated user's email to construct Gmail links.
 * 
 * @returns Object containing functions to open Gmail searches and previews
 */
export function useViewInGmail() {
  const { user } = useAuth();
  
  /**
   * Helper function to determine the user email for constructing Gmail links.
   * Uses the Supabase authenticated user's email.
   */
  const determineUserEmailForGmailLink = useCallback(() => {
    if (user?.email) {
      return user.email;
    }
    console.error("[ViewInGmail] Critical: User email is not available. Cannot construct Gmail link.");
    return ''; // Fallback to empty string, which likely defaults to /u/0/
  }, [user?.email]); // Dependency is the user's email
  
  /**
   * Log a view or preview action to Supabase
   * @param type The type of action ('view' or 'preview')
   * @param count Number of senders involved (for view) or 1 (for preview)
   */
  const logGmailAction = useCallback(async (type: ActionType, count: number) => {
    if (!user?.id) {
      console.warn('Cannot log Gmail action: User ID not available.');
      return;
    }

    try {
      await createActionLog({
        user_id: user.id,
        type: type,
        status: 'completed',
        count
      });
    } catch (error) {
      console.error(`Failed to log ${type} action:`, error);
    }
  }, [user?.id]);
  
  /**
   * Open Gmail search for a specific sender in a new tab
   * @param email The sender's email address to search for
   */
  const viewSenderInGmail = useCallback(async (email: string) => {
    const userEmailForLink = determineUserEmailForGmailLink();

    if (!userEmailForLink) { 
      toast.error("Your account email is not available. Cannot open in Gmail.");
      return;
    }
    
    await logGmailAction('view', 1);
    const searchQuery = `from:${encodeURIComponent(email)}`;
    window.open(`https://mail.google.com/mail/u/${userEmailForLink}/#search/${searchQuery}`, '_blank');
  }, [determineUserEmailForGmailLink, logGmailAction]);
  
  /**
   * Open Gmail search for multiple senders in a new tab
   * @param emails Array of sender email addresses to search for
   */
  const viewMultipleSendersInGmail = useCallback(async (emails: string[]) => {
    if (emails.length === 0) {
      toast.warning('No senders selected to view in Gmail.');
      return;
    }

    const userEmailForLink = determineUserEmailForGmailLink();

    if (!userEmailForLink) {
      toast.error("Your account email is not available. Cannot open in Gmail.");
      return;
    }
        
    await logGmailAction('view', emails.length);
    const searchQuery = emails.map(senderEmail => `from:${encodeURIComponent(senderEmail)}`).join(' OR ');
    window.open(`https://mail.google.com/mail/u/${userEmailForLink}/#search/${searchQuery}`, '_blank');
  }, [determineUserEmailForGmailLink, logGmailAction]);
  
  /**
   * Open Gmail search based on a complex filter query in a new tab
   * @param filterQuery The pre-constructed Gmail search query string
   */
  const viewFilteredEmailsInGmail = useCallback(async (filterQuery: string) => {
    if (!filterQuery.trim()) {
      toast.warning('No filter criteria provided for preview.');
      return;
    }

    const userEmailForLink = determineUserEmailForGmailLink();

    if (!userEmailForLink) {
      toast.error("Your account email is not available. Cannot open in Gmail.");
      return;
    }
    
    await logGmailAction('preview', 1);
    // Properly encode the entire filter query for URL usage
    const encodedQuery = encodeURIComponent(filterQuery);
    window.open(`https://mail.google.com/mail/u/${userEmailForLink}/#search/${encodedQuery}`, '_blank');
  }, [determineUserEmailForGmailLink, logGmailAction]);
  
  return {
    viewSenderInGmail,
    viewMultipleSendersInGmail,
    viewFilteredEmailsInGmail
  };
} 