"use client";

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthProvider';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { createActionLog } from '@/supabase/actions/logAction';
import { markSenderActionTaken } from '@/lib/storage/senderAnalysis'; 
import { parseMailto } from '@/lib/gmail/parseMailto';
import { sendUnsubEmail } from '@/lib/gmail/sendUnsubEmail';
import { ActionType, ActionStatus, ActionEndType } from '@/types/actions';

// --- Queue Types ---
import { UnsubscribeJobPayload, ProgressCallback, ExecutorResult } from '@/types/queue';

// Matches the one in getUnsubscribeMethod.ts and expected by AnalysisView
export interface UnsubscribeMethodDetails {
  type: "url" | "mailto";
  value: string; 
  requiresPost?: boolean;
}

export interface UnsubscribeHookParams {
  senderEmail: string;
}

// Add ReauthModalState, similar to other hooks
interface ReauthModalState {
  isOpen: boolean;
  type: 'expired'; // For unsubscribe, 'expired' is usually the only relevant type
}

export function useUnsubscribe() {
  const { user } = useAuth();
  const {
    getAccessToken,
    hasRefreshToken: isGmailConnected,
  } = useGmailPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add reauthModal state
  const [reauthModal, setReauthModal] = useState<ReauthModalState>({
    isOpen: false,
    type: 'expired',
  });

  // Add closeReauthModal function
  const closeReauthModal = useCallback(() => {
    console.log('[Unsubscribe] Closing reauth modal');
    setReauthModal({ isOpen: false, type: 'expired' });
  }, []);

  const run = useCallback(async (
    params: UnsubscribeHookParams, 
    methodDetails: UnsubscribeMethodDetails,
    queueProgressCallback?: ProgressCallback,
    abortSignal?: AbortSignal
  ): Promise<{ success: boolean; error: string | null }> => {
    setIsLoading(true);
    setError(null);
    let operationErrorMessage: string | null = null;
    console.log(`useUnsubscribe: Unsubscribing from ${params.senderEmail} using ${methodDetails.type}: ${methodDetails.value}`);

    // Check for cancellation at the start
    if (abortSignal?.aborted) {
      console.log('[Unsubscribe] Operation cancelled before starting');
      setIsLoading(false);
      return { success: false, error: 'Operation cancelled by user' };
    }

    // Report initial progress to queue (only for EMAIL-based operations)
    if (queueProgressCallback && methodDetails.type === "mailto" && !methodDetails.requiresPost) {
      queueProgressCallback(0, 1); // Unsubscribe is a single operation
    }

    if (!user?.id) {
      operationErrorMessage = "User not authenticated";
      toast.error("User not authenticated for unsubscribe action.");
      setIsLoading(false);
      setError(operationErrorMessage);
      return { success: false, error: operationErrorMessage };
    }

    let acquiredAccessToken: string | null = null;

    if (methodDetails.type === "mailto" && !methodDetails.requiresPost) {
      if (!isGmailConnected) {
        operationErrorMessage = "Gmail not connected. Please reconnect to send unsubscribe email.";
        toast.error(operationErrorMessage);
        setIsLoading(false);
        setError(operationErrorMessage);
        return { success: false, error: operationErrorMessage };
      }
      try {
        acquiredAccessToken = await getAccessToken();
        if (!acquiredAccessToken) {
          throw new Error("Failed to retrieve a valid access token from getAccessToken.");
        }
        console.log("[useUnsubscribe] Access token for mailto acquired.");
      } catch (tokenError: any) {
        operationErrorMessage = tokenError.message || "Gmail authentication failed. Please reconnect.";
        toast.error(operationErrorMessage);
        setIsLoading(false);
        setError(operationErrorMessage);
        // Set reauthModal state on token failure
        setReauthModal({ isOpen: true, type: 'expired' }); 
        return { success: false, error: operationErrorMessage };
      }
    }

    let success = false;
    let actionEndType: ActionEndType = 'runtime_error';

    try {
      if (methodDetails.type === "url") {
        if (!methodDetails.value || !methodDetails.value.toLowerCase().startsWith('http')) {
          operationErrorMessage = "Invalid or missing unsubscribe URL.";
          throw new Error(operationErrorMessage);
        }
        
        console.log("[useUnsubscribe] Attempting window.open for URL:", methodDetails.value);
        const newWindow = window.open(methodDetails.value, "_blank", "noopener,noreferrer");
        console.log("[useUnsubscribe] window.open returned:", newWindow); 
        
        if (newWindow === null) {
            console.log("[useUnsubscribe] Entering block for newWindow === null (Pop-up possibly blocked initially)."); 
            toast.warning(`Attempted to open unsubscribe link for ${params.senderEmail}`);
            actionEndType = 'success';
            success = true; 
        } else {
            console.log("[useUnsubscribe] Entering block for newWindow !== null."); 
            console.log("[useUnsubscribe] Toasting URL opened success message."); 
            toast.success(`Opened unsubscribe link for ${params.senderEmail}. Please complete the process if the tab opened correctly.`);
            actionEndType = 'success';
            success = true;
        }
      } else if (methodDetails.type === "mailto") {
        const gapiInstance = (window as any).gapi;
        if (gapiInstance && gapiInstance.client && acquiredAccessToken) {
          try {
            gapiInstance.client.setToken({ access_token: acquiredAccessToken });
            console.log("[useUnsubscribe] Explicitly set GAPI client token for send call.");
            const currentGapiToken = gapiInstance.client.getToken();
            console.log("[useUnsubscribe] Current GAPI client token after setToken:", currentGapiToken ? currentGapiToken.access_token.substring(0,20) + '...': 'No token in GAPI client');
          } catch (e) {
            console.error("[useUnsubscribe] Error setting GAPI token:", e)
          }
        } else if (acquiredAccessToken && !gapiInstance?.client) {
             console.warn("[useUnsubscribe] GAPI client not available to set token, though token was acquired.")
        } else if (!acquiredAccessToken && !methodDetails.requiresPost){
            operationErrorMessage = "Access token not available for sending email.";
            throw new Error(operationErrorMessage);
        }

        if (methodDetails.requiresPost) {
          toast.info(`One-click unsubscribe for ${params.senderEmail} (mailto with POST) is not yet implemented. Opening mailto link as a fallback.`);
          window.location.href = methodDetails.value; 
          actionEndType = 'success'; 
          success = true; 
        } else {
          if (!acquiredAccessToken) {
            operationErrorMessage = "Access token is required for sending email but was not available.";
            throw new Error(operationErrorMessage);
          }
          
          // Check for cancellation before sending email
          if (abortSignal?.aborted) {
            console.log('[Unsubscribe] Operation cancelled before sending email');
            setIsLoading(false);
            return { success: false, error: 'Operation cancelled by user' };
          }
          
          const mailtoParts = parseMailto(methodDetails.value);
          if (!mailtoParts || !mailtoParts.to) {
            operationErrorMessage = `Invalid mailto link or missing recipient: ${methodDetails.value}`;
            throw new Error(operationErrorMessage);
          }
          await sendUnsubEmail({
            accessToken: acquiredAccessToken!,
            to: mailtoParts.to,
            subject: mailtoParts.subject || "Unsubscribe",
            body: mailtoParts.body || "Please unsubscribe me from this mailing list.",
          });
          
          // Check for cancellation after sending email
          if (abortSignal?.aborted) {
            console.log('[Unsubscribe] Operation cancelled after sending email');
            setIsLoading(false);
            return { success: false, error: 'Operation cancelled by user' };
          }
          
          toast.success(`Unsubscribe email sent for ${params.senderEmail}.`);
          actionEndType = 'success';
          success = true;
        }
      }

      if (success) {
        console.log("[useUnsubscribe] Proceeding with logging/state update after success (or assumed success for URL).");
        await markSenderActionTaken(params.senderEmail, 'unsubscribe');
        console.log(`[useUnsubscribe] Marked action taken for ${params.senderEmail}`);
        await createActionLog({
          user_id: user.id, 
          type: 'unsubscribe' as ActionType,
          status: 'completed' as ActionStatus, 
          count: 1,
          filters: { sender: params.senderEmail, method: methodDetails.type, value: methodDetails.value },
          notes: methodDetails.requiresPost ? "Mailto one-click (opened link as fallback)" : undefined
        });
        console.log(`[useUnsubscribe] Logged unsubscribe action to Supabase for ${params.senderEmail}`);
        
        // Report completion to queue (only for EMAIL-based operations)
        if (queueProgressCallback && methodDetails.type === "mailto" && !methodDetails.requiresPost) {
          queueProgressCallback(1, 1);
        }
      }
      
    } catch (err: any) {
      console.error("--- Unsubscribe Error Caught ---");
      console.error("Caught Error Object:", err);
      console.error("Error Message:", err.message);
      console.error("Current success flag before catch:", success);
      console.error("Current errorMessage before catch:", operationErrorMessage);
      
      const finalErrorMessage = operationErrorMessage || err.message || "Failed to process unsubscribe request.";
      console.error("Final error message determined:", finalErrorMessage);
      
      actionEndType = 'runtime_error';
      success = false; 
      setError(finalErrorMessage);
      
      console.log("Toasting general error:", finalErrorMessage);
      toast.error(finalErrorMessage); 
    } finally {
      setIsLoading(false);
    }
    return { success, error: operationErrorMessage };
  }, [
    user,
    getAccessToken,
    isGmailConnected,
  ]);

  // --- Queue Integration ---
  // Create a queue executor wrapper that converts payloads and calls existing function
  // Only for EMAIL-based unsubscribe operations (mailto without requiresPost)
  const queueExecutor = useCallback(async (
    payload: UnsubscribeJobPayload,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ): Promise<ExecutorResult> => {
    console.log('[Unsubscribe] Queue executor called with payload:', payload);
    
    // Only handle EMAIL-based unsubscribe operations
    if (payload.methodDetails.type !== "mailto" || payload.methodDetails.requiresPost) {
      console.log('[Unsubscribe] Queue executor skipping non-email operation:', payload.methodDetails.type);
      return {
        success: false,
        error: 'Queue only supports email-based unsubscribe operations'
      };
    }
    
    try {
      // Convert queue payload to hook format
      const params: UnsubscribeHookParams = {
        senderEmail: payload.senderEmail
      };
      
      // Call existing function with progress callback and abort signal
      const result = await run(params, payload.methodDetails, onProgress, abortSignal);
      
      // Return queue-compatible result
      return {
        success: result.success,
        processedCount: result.success ? 1 : 0,
        error: result.error || undefined
      };
    } catch (error: any) {
      console.error('[Unsubscribe] Queue executor error:', error);
      
      // Handle specific error cases
      let errorMessage = 'Unknown error occurred';
      if (abortSignal.aborted) {
        errorMessage = 'Operation cancelled by user';
      } else if (error.message?.includes('authentication') || error.message?.includes('token')) {
        errorMessage = 'Gmail authentication failed - please reconnect';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error - please check your connection';
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        errorMessage = 'Gmail API rate limit reached - please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [run]);

  // Register executor with queue system
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__queueRegisterExecutor) {
      console.log('[Unsubscribe] Registering queue executor');
      (window as any).__queueRegisterExecutor('unsubscribe', queueExecutor);
    }
  }, [queueExecutor]);

  return {
    run,
    isLoading,
    error,
    // Return new modal state and function
    reauthModal,
    closeReauthModal,
  };
} 