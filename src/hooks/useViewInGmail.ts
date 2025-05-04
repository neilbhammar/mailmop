import { useCallback } from 'react';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useAuth } from '@/context/AuthProvider';
import { toast } from 'sonner';
import { createActionLog } from '@/supabase/actions/logAction';
import { useUser } from '@supabase/auth-helpers-react';
import { ActionType } from '@/types/actions';

/**
 * Hook to handle the "View in Gmail" and "Preview Filtered Emails" functionality
 * 
 * This hook provides functions to open Gmail search results for specific senders
 * or complex filter queries in a new browser tab and logs these actions to Supabase.
 * 
 * @returns Object containing functions to open Gmail searches and previews
 */
export function useViewInGmail() {
  const { gmailEmail } = useGmailPermissions();
  const { user } = useAuth();
  const supabaseUser = useUser();
  
  // Get the user's email from either the Gmail permissions or Auth context
  // Use empty string as fallback if no email is found
  const userEmail = gmailEmail || user?.email || '';
  
  /**
   * Log a view or preview action to Supabase
   * @param type The type of action ('view' or 'preview')
   * @param count Number of senders involved (for view) or 1 (for preview)
   */
  const logGmailAction = useCallback(async (type: ActionType, count: number) => {
    // Ensure we have a Supabase user ID before logging
    if (!supabaseUser?.id) {
      console.warn('Cannot log Gmail action: Supabase user ID not available.');
      return;
    }

    try {
      // Log the action using the createActionLog function
      await createActionLog({
        user_id: supabaseUser.id,
        type: type, // Use the provided action type
        status: 'completed', // Assume completion for view/preview
        count // Log the count provided
      });
    } catch (error) {
      console.error(`Failed to log ${type} action:`, error);
      // Don't show error to user since this is non-critical logging
    }
  }, [supabaseUser?.id]); // Dependency is the Supabase user ID
  
  /**
   * Open Gmail search for a specific sender in a new tab
   * @param email The sender's email address to search for
   */
  const viewSenderInGmail = useCallback(async (email: string) => {
    // Log the 'view' action with a count of 1
    await logGmailAction('view', 1);
    
    // Construct the Gmail search URL for the specific sender
    // Encode the email address to handle special characters
    const searchQuery = `from:${encodeURIComponent(email)}`;
    // Open the URL in a new tab, targeting the user's specific Gmail account if available
    window.open(`https://mail.google.com/mail/u/${userEmail}/#search/${searchQuery}`, '_blank');
  }, [userEmail, logGmailAction]); // Dependencies: userEmail and the logging function
  
  /**
   * Open Gmail search for multiple senders in a new tab
   * @param emails Array of sender email addresses to search for
   */
  const viewMultipleSendersInGmail = useCallback(async (emails: string[]) => {
    // Prevent action if no emails are provided
    if (emails.length === 0) {
      toast.warning('No senders selected to view in Gmail.');
      return;
    }
    
    // Log the 'view' action with the count of senders
    await logGmailAction('view', emails.length);
    
    // Construct the Gmail search query with multiple "from:" operators combined with OR
    // Encode each email address
    const searchQuery = emails.map(email => `from:${encodeURIComponent(email)}`).join(' OR ');
    
    // Open the URL in a new tab
    window.open(`https://mail.google.com/mail/u/${userEmail}/#search/${encodeURIComponent(searchQuery)}`, '_blank');
  }, [userEmail, logGmailAction]); // Dependencies: userEmail and the logging function
  
  /**
   * Open Gmail search based on a complex filter query in a new tab
   * @param filterQuery The pre-constructed Gmail search query string (e.g., "(from:a OR from:b) (is:unread OR before:2023/01/01)")
   */
  const viewFilteredEmailsInGmail = useCallback(async (filterQuery: string) => {
    // Prevent action if the query is empty
    if (!filterQuery.trim()) {
      toast.warning('No filter criteria provided for preview.');
      return;
    }
    
    // Log the 'preview' action (count is typically 1 for a single preview operation)
    await logGmailAction('preview', 1);
    
    // The filterQuery is already constructed, just encode it for the URL
    // Open the URL in a new tab
    window.open(`https://mail.google.com/mail/u/${userEmail}/#search/${encodeURIComponent(filterQuery)}`, '_blank');
  }, [userEmail, logGmailAction]); // Dependencies: userEmail and the logging function
  
  // Return the available functions from the hook
  return {
    viewSenderInGmail,
    viewMultipleSendersInGmail,
    viewFilteredEmailsInGmail // Expose the new preview function
  };
} 