import { useCallback } from 'react';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useAuth } from '@/context/AuthProvider';
import { toast } from 'sonner';
import { createActionLog } from '@/supabase/actions/logAction';
import { useUser } from '@supabase/auth-helpers-react';

/**
 * Hook to handle the "View in Gmail" functionality
 * 
 * This hook provides functions to open Gmail search results for specific senders
 * in a new browser tab and logs these actions to Supabase.
 * 
 * @returns Object containing functions to open Gmail searches
 */
export function useViewInGmail() {
  const { gmailEmail } = useGmailPermissions();
  const { user } = useAuth();
  const supabaseUser = useUser();
  
  // Get the user's email from either the Gmail permissions or Auth context
  const userEmail = gmailEmail || user?.email || '';
  
  /**
   * Log a view action to Supabase
   * @param count Number of senders being viewed
   */
  const logViewAction = useCallback(async (count: number) => {
    if (!supabaseUser?.id) return;

    try {
      await createActionLog({
        user_id: supabaseUser.id,
        type: 'view',
        status: 'completed',
        count
      });
    } catch (error) {
      console.error('Failed to log view action:', error);
      // Don't show error to user since this is non-critical
    }
  }, [supabaseUser?.id]);
  
  /**
   * Open Gmail search for a specific sender in a new tab
   * @param email The sender's email address to search for
   */
  const viewSenderInGmail = useCallback(async (email: string) => {
    // Log the view action first
    await logViewAction(1);
    
    // Using the format from the user's example
    window.open(`https://mail.google.com/mail/u/${userEmail}/#search/from:${encodeURIComponent(email)}`, '_blank');
  }, [userEmail, logViewAction]);
  
  /**
   * Open Gmail search for multiple senders in a new tab
   * @param emails Array of sender email addresses to search for
   */
  const viewMultipleSendersInGmail = useCallback(async (emails: string[]) => {
    if (emails.length === 0) {
      toast.warning('No senders selected');
      return;
    }
    
    // Log the view action first
    await logViewAction(emails.length);
    
    // Construct the Gmail search query with multiple "from:" operators combined with OR
    const searchQuery = emails.map(email => `from:${email}`).join(' OR ');
    
    // Using the format from the user's example
    window.open(`https://mail.google.com/mail/u/${userEmail}/#search/${encodeURIComponent(searchQuery)}`, '_blank');
  }, [userEmail, logViewAction]);
  
  return {
    viewSenderInGmail,
    viewMultipleSendersInGmail
  };
} 