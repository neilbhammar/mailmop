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
  const { tokenStatus, getAccessToken, requestPermissions, isClientLoaded } = useGmailPermissions();

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

      // --- Token & Permission Checks ---
      if (tokenStatus.state !== 'valid' && tokenStatus.state !== 'expiring_soon') {
        if (tokenStatus.state === 'expired') {
          toast.error('Gmail token expired', {
            description: 'Please reconnect to Gmail.',
            action: { label: 'Reconnect', onClick: () => requestPermissions() }
          });
          updateProgress({ status: 'error', error: 'Token expired' });
          return { success: false };
        } else {
          toast.error('Gmail connection error', {
            description: `Token state is ${tokenStatus.state}. Please reconnect.`,
            action: { label: 'Reconnect', onClick: () => requestPermissions() }
          });
          updateProgress({ status: 'error', error: `Gmail token state: ${tokenStatus.state}` });
          return { success: false };
        }
      }

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
        const accessToken = await getAccessToken();
        
        // Create a single filter for all senders
        const result = await createFiltersForSenders(
          accessToken,
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
    [user?.id, isClientLoaded, tokenStatus, getAccessToken, requestPermissions]
  );

  return {
    startCreateFilter,
    progress,
  };
} 