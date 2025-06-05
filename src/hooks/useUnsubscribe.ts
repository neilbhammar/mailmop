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
import { logger } from '@/lib/utils/logger';

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
    logger.debug('Closing reauth modal', { component: 'useUnsubscribe' });
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
    logger.debug('Starting unsubscribe operation', { 
      component: 'useUnsubscribe',
      senderEmail: params.senderEmail,
      methodType: methodDetails.type
    });

    // Check for cancellation at the start
    if (abortSignal?.aborted) {
      logger.debug('Operation cancelled before starting', { component: 'useUnsubscribe' });
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
        logger.debug('Access token acquired for mailto operation', { component: 'useUnsubscribe' });
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
        
        logger.debug('Attempting to open unsubscribe URL', { component: 'useUnsubscribe' });
        const newWindow = window.open(methodDetails.value, "_blank", "noopener,noreferrer");
        logger.debug('Window.open result', { 
          component: 'useUnsubscribe',
          windowOpened: newWindow !== null
        });
        
        if (newWindow === null) {
            logger.debug('Pop-up blocked, showing warning', { component: 'useUnsubscribe' });
            toast.warning(`Attempted to open unsubscribe link for ${params.senderEmail}`);
            actionEndType = 'success';
            success = true; 
        } else {
            logger.debug('URL opened successfully', { component: 'useUnsubscribe' });
            toast.success(`Opened unsubscribe link for ${params.senderEmail}. Please complete the process if the tab opened correctly.`);
            actionEndType = 'success';
            success = true;
        }
      } else if (methodDetails.type === "mailto") {
        const gapiInstance = (window as any).gapi;
        if (gapiInstance && gapiInstance.client && acquiredAccessToken) {
          try {
            gapiInstance.client.setToken({ access_token: acquiredAccessToken });
            logger.debug('GAPI client token set for send operation', { component: 'useUnsubscribe' });
            const currentGapiToken = gapiInstance.client.getToken();
            logger.debug('GAPI client token verified', { 
              component: 'useUnsubscribe',
              hasToken: !!currentGapiToken?.access_token
            });
          } catch (e) {
            logger.error('Error setting GAPI token', { 
              component: 'useUnsubscribe',
              error: e instanceof Error ? e.message : 'Unknown error'
            });
          }
        } else if (acquiredAccessToken && !gapiInstance?.client) {
             logger.warn('GAPI client not available despite having token', { component: 'useUnsubscribe' });
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
            logger.debug('Operation cancelled before sending email', { component: 'useUnsubscribe' });
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
            logger.debug('Operation cancelled after sending email', { component: 'useUnsubscribe' });
            setIsLoading(false);
            return { success: false, error: 'Operation cancelled by user' };
          }
          
          toast.success(`Unsubscribe email sent for ${params.senderEmail}.`);
          actionEndType = 'success';
          success = true;
        }
      }

      if (success) {
        logger.debug('Proceeding with logging after successful operation', { component: 'useUnsubscribe' });
        await markSenderActionTaken(params.senderEmail, 'unsubscribe');
        logger.debug('Marked action taken for sender', { 
          component: 'useUnsubscribe',
          senderEmail: params.senderEmail
        });
        await createActionLog({
          user_id: user.id, 
          type: 'unsubscribe' as ActionType,
          status: 'completed' as ActionStatus, 
          count: 1,
          filters: { method: methodDetails.type },
          notes: methodDetails.requiresPost ? "Mailto one-click (opened link as fallback)" : undefined
        });
        logger.debug('Logged unsubscribe action to Supabase', { 
          component: 'useUnsubscribe',
          senderEmail: params.senderEmail
        });
        
        // Report completion to queue (only for EMAIL-based operations)
        if (queueProgressCallback && methodDetails.type === "mailto" && !methodDetails.requiresPost) {
          queueProgressCallback(1, 1);
        }
      }
      
    } catch (err: any) {
      logger.error('Unsubscribe operation error', { 
        component: 'useUnsubscribe',
        error: err instanceof Error ? err.message : 'Unknown error',
        success,
        operationErrorMessage
      });
      
      const finalErrorMessage = operationErrorMessage || err.message || "Failed to process unsubscribe request.";
      logger.error('Final error determined', { 
        component: 'useUnsubscribe',
        finalErrorMessage
      });
      
      actionEndType = 'runtime_error';
      success = false; 
      setError(finalErrorMessage);
      
      logger.debug('Showing error toast', { 
        component: 'useUnsubscribe',
        errorMessage: finalErrorMessage
      });
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
    logger.debug('Queue executor called', { 
      component: 'useUnsubscribe',
      methodType: payload.methodDetails.type
    });
    
    // Only handle EMAIL-based unsubscribe operations
    if (payload.methodDetails.type !== "mailto" || payload.methodDetails.requiresPost) {
      logger.debug('Queue executor skipping non-email operation', { 
        component: 'useUnsubscribe',
        methodType: payload.methodDetails.type
      });
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
      logger.error('Queue executor error', { 
        component: 'useUnsubscribe',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
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
      logger.debug('Registering queue executor', { component: 'useUnsubscribe' });
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