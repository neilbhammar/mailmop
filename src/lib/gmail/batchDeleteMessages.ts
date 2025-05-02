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
  
  // --- DEBUG LOG --- 
  console.log('[batchDeleteMessages] Checking gapi client status:', {
    gapiExists: !!gapi,
    clientExists: !!gapi?.client,
    gmailClientExists: !!gapi?.client?.gmail
  });
  // --- END DEBUG LOG ---
  
  if (!gapi?.client?.gmail) {
    throw new Error("Gmail API client is not loaded.");
  }

  // Don't make an API call if there are no IDs to delete.
  if (!messageIds || messageIds.length === 0) {
    console.warn("[batchDeleteMessages] No message IDs provided for deletion.");
    return;
  }

  // The batchDelete API has a limit of 1000 IDs per request.
  if (messageIds.length > 1000) {
    console.warn(
      `[batchDeleteMessages] Attempted to delete ${messageIds.length} messages, but the limit is 1000. Truncating the list.`
    );
    // Although we should ideally handle splitting into multiple batches upstream,
    // we'll truncate here as a safeguard to prevent API errors.
    messageIds = messageIds.slice(0, 1000);
  }

  console.log(
    `[batchDeleteMessages] Attempting to delete ${messageIds.length} messages.`
  );

  try {
    // Set the access token for this API request.
    // It's generally good practice to set this before each gapi call,
    // although it might be set globally elsewhere.
    gapi.client.setToken({ access_token: accessToken });

    // Make the API call to batch delete the messages.
    // We use 'me' to refer to the authenticated user.
    const response = await gapi.client.gmail.users.messages.batchDelete({
      userId: "me",
      ids: messageIds, // Pass the array of message IDs in the request body
    });

    // The batchDelete endpoint returns a 204 No Content status on success.
    // If the status code is different, or if an error was thrown, something went wrong.
    // The gapi client library usually throws an error for non-2xx responses,
    // so we might not even reach here if there's a failure.
    if (response.status !== 204) {
      console.error(
        "[batchDeleteMessages] Unexpected status code:",
        response.status,
        response.result
      );
      // We construct an error message, trying to get useful details from the response.
      const errorDetails = response.result?.error?.message || "Unknown error";
      throw new Error(
        `Failed to batch delete messages. Status: ${response.status}. Details: ${errorDetails}`
      );
    }

    console.log(
      `[batchDeleteMessages] Successfully deleted ${messageIds.length} messages.`
    );
  } catch (error: any) {
    // Catch any errors during the API call.
    console.error("[batchDeleteMessages] Error during batch deletion:", error);

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