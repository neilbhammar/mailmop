import { logger } from '@/lib/utils/logger';

/**
 * batchDeleteMessages.ts
 *
 * Helper function to delete a batch of Gmail messages using their IDs.
 * This uses the `users.messages.batchDelete` endpoint which is more
 * efficient than deleting messages one by one.
 */

/**
 * Deletes a batch of emails from the user's Gmail account.
 *
 * @param accessToken - The user's valid Google OAuth 2.0 access token.
 * @param messageIds - An array of message IDs to be deleted (max 1000 per call).
 * @returns A Promise that resolves when the API call is complete.
 *          It throws an error if the deletion fails.
 */
export async function batchDeleteMessages(
  accessToken: string,
  messageIds: string[]
): Promise<void> {
  // Check if the Google API client is loaded and ready.
  // We need to cast window to access gapi directly if not using types
  const gapi = (window as any).gapi;
  
  logger.debug('Checking gapi client status', {
    component: 'batchDeleteMessages',
    gapiExists: !!gapi,
    clientExists: !!gapi?.client,
    gmailClientExists: !!gapi?.client?.gmail
  });
  
  if (!gapi?.client?.gmail) {
    throw new Error("Gmail API client is not loaded.");
  }

  // Don't make an API call if there are no IDs to delete.
  if (!messageIds || messageIds.length === 0) {
    logger.warn('No message IDs provided for deletion', { component: 'batchDeleteMessages' });
    return;
  }

  // The batchDelete API has a limit of 1000 IDs per request.
  if (messageIds.length > 1000) {
    logger.warn('Message count exceeds API limit, truncating', {
      component: 'batchDeleteMessages',
      requested: messageIds.length,
      limit: 1000
    });
    // Although we should ideally handle splitting into multiple batches upstream,
    // we'll truncate here as a safeguard to prevent API errors.
    messageIds = messageIds.slice(0, 1000);
  }

  logger.debug('Attempting to delete messages', {
    component: 'batchDeleteMessages',
    messageCount: messageIds.length
  });

  try {
    // Set the access token for this API request.
    // It's generally good practice to set this before each gapi call,
    // although it might be set globally elsewhere.
    logger.debug('Setting access token for gapi client', { component: 'batchDeleteMessages' });
    gapi.client.setToken({ access_token: accessToken });

    // Check token scopes for debugging (WITHOUT logging the actual token)
    try {
      // SECURITY: Use a separate fetch to check token info without logging the token URL
      const tokenInfo = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
      const tokenData = await tokenInfo.json();
      
      logger.debug('Token scope validation', {
        component: 'batchDeleteMessages',
        hasScope: tokenData.scope?.includes('gmail.modify'),
        expiresIn: tokenData.expires_in,
        audience: tokenData.audience?.substring(0, 20) + '...' // Truncate for safety
      });
      
      // Check if we have the modify scope
      const hasModifyScope = tokenData.scope?.includes('gmail.modify');
      if (!hasModifyScope) {
        logger.error('Token missing gmail.modify scope', {
          component: 'batchDeleteMessages',
          currentScopes: tokenData.scope,
          requiredScope: 'https://www.googleapis.com/auth/gmail.modify'
        });
      } else {
        logger.debug('Token has required gmail.modify scope', { component: 'batchDeleteMessages' });
      }
    } catch (tokenDebugError) {
      logger.warn('Could not validate token scopes', { 
        component: 'batchDeleteMessages',
        error: tokenDebugError instanceof Error ? tokenDebugError.message : 'Unknown error'
      });
    }

    // Make the API call to batch delete the messages.
    // We use 'me' to refer to the authenticated user.
    logger.debug('Making API call to batch delete', { component: 'batchDeleteMessages' });
    const response = await gapi.client.gmail.users.messages.batchDelete({
      userId: "me",
      ids: messageIds, // Pass the array of message IDs in the request body
    });

    // The batchDelete endpoint returns a 204 No Content status on success.
    // If the status code is different, or if an error was thrown, something went wrong.
    // The gapi client library usually throws an error for non-2xx responses,
    // so we might not even reach here if there's a failure.
    if (response.status !== 204) {
      logger.error('Unexpected status code from batch delete', {
        component: 'batchDeleteMessages',
        status: response.status,
        hasResult: !!response.result
      });
      // We construct an error message, trying to get useful details from the response.
      const errorDetails = response.result?.error?.message || "Unknown error";
      throw new Error(
        `Failed to batch delete messages. Status: ${response.status}. Details: ${errorDetails}`
      );
    }

    logger.debug('Successfully deleted messages', {
      component: 'batchDeleteMessages',
      messageCount: messageIds.length
    });
  } catch (error: any) {
    // Catch any errors during the API call.
    logger.error('Error during batch deletion', { 
      component: 'batchDeleteMessages',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error?.result?.error?.code
    });
    
    // Check for scope insufficiency error
    if (error?.result?.error?.code === 403 && 
        error?.result?.error?.message?.includes('insufficient authentication scopes')) {
      logger.error('Insufficient scopes detected', { 
        component: 'batchDeleteMessages',
        errorCode: error?.result?.error?.code
      });
      
      // Provide specific guidance for scope issues
      throw new Error(
        `Gmail API access denied: Your current Gmail connection doesn't have permission to delete emails. 
        
To fix this:
1. Go to your MailMop dashboard
2. Look for the Gmail connection status in the top bar
3. Click "Disconnect Gmail" 
4. Click "Connect Gmail" and re-authorize with deletion permissions
        
This happens when Gmail was connected before MailMop had deletion features.`
      );
    }

    // Try to provide a more specific error message if possible.
    const errorMessage =
      error?.result?.error?.message ||
      error?.message ||
      "An unknown error occurred during batch deletion.";

    // Re-throw the error so the calling function knows the operation failed.
    throw new Error(`Batch deletion failed: ${errorMessage}`);
  } finally {
    // It's good practice to clear the token after the request,
    // especially if the token management is handled per-request.
    // However, if a central provider manages the token, this might not be necessary.
    // gapi.client.setToken(null); // Uncomment if per-request token setting is used.
  }
} 