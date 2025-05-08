/**
 * useCreateFilter.ts
 * 
 * Hook for creating Gmail filters to automatically apply/remove labels for specific senders.
 */
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// --- Contexts & Hooks ---
import { useAuth } from '@/context/AuthProvider';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';

// --- API/Helper Functions ---
import { createFiltersForSenders } from '@/lib/gmail/createFilter';

// --- Storage & Logging ---
import { createActionLog, completeActionLog } from '@/supabase/actions/logAction';

// --- Types ---
export type CreateFilterStatus = 'idle' | 'creating' | 'completed' | 'error';

export interface CreateFilterProgress {
  status: CreateFilterStatus;
  error?: string;
  completedSenders: string[];
  failedSenders: string[];
}

export interface CreateFilterOptions {
  senders: string[];
  labelIds: string[];
  actionType: 'add' | 'remove';
}

export function useCreateFilter() {
  const { user } = useAuth();
  const {
    getAccessToken,
    hasRefreshToken: isGmailConnected,
    isClientLoaded
  } = useGmailPermissions();

  // State for progress visible to the UI
  const [progress, setProgress] = useState<CreateFilterProgress>({
    status: 'idle',
    completedSenders: [],
    failedSenders: [],
  });

  /**
   * Updates the progress state
   */
  const updateProgress = useCallback(
    (newProgress: Partial<CreateFilterProgress>) => {
      setProgress((prev) => ({ ...prev, ...newProgress }));
    },
    []
  );

  /**
   * Starts the process of creating filters
   */
  const startCreateFilter = useCallback(
    async (options: CreateFilterOptions): Promise<{ success: boolean }> => {
      console.log('[CreateFilter] Starting filter creation:', options);

      // --- Basic Checks ---
      if (!user?.id) {
        toast.error('You must be logged in to create filters.');
        return { success: false };
      }
      if (!options.senders?.length || !options.labelIds?.length) {
        toast.warning('No senders or labels selected.');
        return { success: false };
      }

      // --- Preparation Phase ---
      updateProgress({ status: 'creating', completedSenders: [], failedSenders: [] });
      
      if (!isClientLoaded) {
        console.error('[CreateFilter] Gmail API client is not loaded yet.');
        toast.error('Gmail client not ready', {
          description: 'Please wait a moment and try again.'
        });
        updateProgress({ status: 'error', error: 'Gmail client not loaded.' });
        return { success: false };
      }

      // --- Token & Permission Checks (New Strategy) ---
      if (!isGmailConnected) {
        toast.error('Gmail not connected.', { description: 'Please reconnect to Gmail to create filters.' });
        updateProgress({ status: 'error', error: 'Gmail not connected. Please reconnect.' });
        return { success: false };
      }

      let acquiredAccessToken: string; // Renamed for clarity
      try {
        const token = await getAccessToken(); 
        if (!token) { 
          throw new Error("Failed to retrieve a valid access token from getAccessToken.");
        }
        acquiredAccessToken = token;
        console.log('[CreateFilter] Access token validated/acquired.');
      } catch (error: any) {
        console.error('[CreateFilter] Failed to validate/acquire token:', error);
        toast.error('Gmail authentication failed.', { description: 'Please reconnect to Gmail.' });
        updateProgress({ status: 'error', error: `Gmail authentication failed: ${error.message}` });
        return { success: false };
      }
      // --- End Token & Permission Checks ---

      // --- Logging Initialization ---
      let supabaseLogId: string | undefined;
      try {
        const actionLog = await createActionLog({
          user_id: user.id,
          type: 'create_filter',
          status: 'started',
          filters: {
            senders: options.senders,
            labelIds: options.labelIds,
            actionType: options.actionType,
          },
          estimated_emails: 0, // Filters don't process emails directly
        });
        supabaseLogId = actionLog.id;
      } catch (error) {
        console.error('[CreateFilter] Failed to create action log:', error);
        toast.error('Failed to start filter creation.');
        updateProgress({ status: 'error', error: 'Failed to log action start.' });
        return { success: false };
      }

      try {
        // const accessToken = await getAccessToken(); // Removed, use acquiredAccessToken from above
        
        // Create a single filter for all senders
        const result = await createFiltersForSenders(
          acquiredAccessToken, // Use the token obtained and validated above
          options.senders,
          {
            addLabelIds: options.actionType === 'add' ? options.labelIds : undefined,
            removeLabelIds: options.actionType === 'remove' ? options.labelIds : undefined,
          }
        );

        if (result.success) {
          // All senders were processed successfully
          updateProgress({
            status: 'completed',
            completedSenders: options.senders,
            failedSenders: []
          });

          // Log success
          if (supabaseLogId) {
            await completeActionLog(
              supabaseLogId,
              'success',
              options.senders.length,
              undefined
            );
          }

          toast.success('Filter created successfully', {
            description: `Created filter for ${options.senders.length} sender${options.senders.length > 1 ? 's' : ''}`
          });

          return { success: true };
        } else {
          // Filter creation failed
          updateProgress({
            status: 'error',
            completedSenders: [],
            failedSenders: options.senders,
            error: result.error
          });

          // Log failure
          if (supabaseLogId) {
            await completeActionLog(
              supabaseLogId,
              'runtime_error',
              0,
              result.error
            );
          }

          toast.error('Failed to create filter', {
            description: result.error
          });

          return { success: false };
        }
      } catch (error: any) {
        console.error('[CreateFilter] Unexpected error:', error);
        
        updateProgress({
          status: 'error',
          completedSenders: [],
          failedSenders: options.senders,
          error: error.message
        });

        // Log failure
        if (supabaseLogId) {
          await completeActionLog(
            supabaseLogId,
            'runtime_error',
            0,
            error.message
          );
        }

        toast.error('Unexpected error creating filter', {
          description: error.message
        });

        return { success: false };
      }
    },
    [
      user?.id,
      isClientLoaded,
      getAccessToken, // Still needed for the try/catch block
      isGmailConnected // Added
    ]
  );

  return {
    startCreateFilter,
    progress,
  };
} 