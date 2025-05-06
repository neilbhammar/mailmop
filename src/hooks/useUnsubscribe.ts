"use client";

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthProvider';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { createActionLog } from '@/supabase/actions/logAction';
import { markSenderActionTaken } from '@/lib/storage/senderAnalysis'; 
import { parseMailto } from '@/lib/gmail/parseMailto';
import { sendUnsubEmail } from '@/lib/gmail/sendUnsubEmail';
import { ActionType, ActionStatus, ActionEndType } from '@/types/actions';

// Matches the one in getUnsubscribeMethod.ts and expected by AnalysisView
export interface UnsubscribeMethodDetails {
  type: "url" | "mailto";
  value: string; 
  requiresPost?: boolean;
}

export interface UnsubscribeHookParams {
  senderEmail: string;
}

export function useUnsubscribe() {
  const { user } = useAuth();
  const { getAccessToken, tokenStatus, requestPermissions } = useGmailPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (params: UnsubscribeHookParams, methodDetails: UnsubscribeMethodDetails): Promise<{ success: boolean; error: string | null }> => {
    setIsLoading(true);
    setError(null);
    let errorMessage: string | null = null;
    console.log(`useUnsubscribe: Unsubscribing from ${params.senderEmail} using ${methodDetails.type}: ${methodDetails.value}`);

    if (!user?.id) {
      errorMessage = "User not authenticated";
      toast.error("User not authenticated for unsubscribe action.");
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }

    if (tokenStatus.state === 'expired') {
      errorMessage = "Gmail token expired. Please re-authenticate.";
      toast.error(errorMessage, {
        action: { label: "Reconnect", onClick: () => requestPermissions() },
      });
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }

    let success = false;
    let actionEndType: ActionEndType = 'runtime_error';

    try {
      if (methodDetails.type === "url") {
        if (!methodDetails.value || typeof methodDetails.value !== 'string' || !methodDetails.value.toLowerCase().startsWith('http')) {
          console.error("[useUnsubscribe] Invalid URL detected:", methodDetails.value);
          errorMessage = "Invalid or missing unsubscribe URL.";
          throw new Error(errorMessage);
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
        const accessToken = await getAccessToken();
        console.log("[useUnsubscribe] Access token for mailto:", accessToken ? accessToken.substring(0, 20) + '...' : 'No token');
        
        const gapiInstance = (window as any).gapi;
        if (gapiInstance && gapiInstance.client && accessToken) {
          try {
            gapiInstance.client.setToken({ access_token: accessToken });
            console.log("[useUnsubscribe] Explicitly set GAPI client token for send call.");
            const currentGapiToken = gapiInstance.client.getToken();
            console.log("[useUnsubscribe] Current GAPI client token after setToken:", currentGapiToken ? currentGapiToken.access_token.substring(0,20) + '...': 'No token in GAPI client');
          } catch (e) {
            console.error("[useUnsubscribe] Error setting GAPI token:", e)
          }
        } else if (!accessToken) {
            console.warn("[useUnsubscribe] No access token retrieved for mailto, GAPI token not set.")
        }

        if (!accessToken && !methodDetails.requiresPost) {
          errorMessage = "Could not retrieve Gmail access token for sending email.";
          throw new Error(errorMessage);
        }

        if (methodDetails.requiresPost) {
          toast.info(`One-click unsubscribe for ${params.senderEmail} (mailto with POST) is not yet implemented. Opening mailto link as a fallback.`);
          window.location.href = methodDetails.value; 
          actionEndType = 'success'; 
          success = true; 
        } else {
          const mailtoParts = parseMailto(methodDetails.value);
          if (!mailtoParts || !mailtoParts.to) {
            errorMessage = `Invalid mailto link or missing recipient: ${methodDetails.value}`;
            throw new Error(errorMessage);
          }
          await sendUnsubEmail({
            accessToken: accessToken!, 
            to: mailtoParts.to,
            subject: mailtoParts.subject || "Unsubscribe",
            body: mailtoParts.body || "Please unsubscribe me from this mailing list.",
          });
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
      }
      
    } catch (err: any) {
      console.error("--- Unsubscribe Error Caught ---");
      console.error("Caught Error Object:", err);
      console.error("Error Message:", err.message);
      console.error("Current success flag before catch:", success);
      console.error("Current errorMessage before catch:", errorMessage);
      
      const finalErrorMessage = errorMessage || err.message || "Failed to process unsubscribe request.";
      console.error("Final error message determined:", finalErrorMessage);
      
      actionEndType = 'runtime_error';
      success = false; 
      
      console.log("Toasting general error:", finalErrorMessage);
      toast.error(finalErrorMessage); 
    } finally {
      setIsLoading(false);
      setError(errorMessage);
    }
    return { success, error: errorMessage };
  }, [user, getAccessToken, tokenStatus, requestPermissions]);

  return {
    run,
    isLoading,
    error,
  };
} 