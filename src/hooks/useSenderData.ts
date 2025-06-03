import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SenderResult } from '@/types/gmail';
import { getAllSenders, ANALYSIS_CHANGE_EVENT } from '@/lib/storage/senderAnalysis';
import { useAnalysis } from '@/context/AnalysisProvider';

// Valid action types
type ActionType = "delete" | "unsubscribe" | "markUnread" | "block";

// Convert SenderResult to table-friendly format
function convertToTableFormat(sender: SenderResult) {
  // Filter actionsTaken to only include valid action types
  const validActions = (sender.actionsTaken || []).filter((action): action is ActionType => {
    return ['delete', 'unsubscribe', 'markUnread', 'block'].includes(action);
  });

  return {
    email: sender.senderEmail,
    name: sender.senderName,
    count: sender.count,
    unread_count: sender.unread_count,
    lastEmail: sender.lastDate,
    actionsTaken: validActions,
    // Include additional metadata for actions
    hasUnsubscribe: sender.hasUnsubscribe || false,
    unsubscribe: sender.unsubscribe,
    messageIds: sender.messageIds || [],
    sampleSubjects: sender.sampleSubjects || []
  };
}

export interface Sender {
  email: string;
  name: string;
  count: number;
  unread_count: number;
  lastEmail: string;
  actionsTaken: any;
  hasUnsubscribe: boolean;
  unsubscribe?: {
    mailto?: string;
    url?: string;
    requiresPost?: boolean;
  };
  messageIds: any;
  sampleSubjects: any;
}

export type TableSender = ReturnType<typeof convertToTableFormat>;

export function useSenderData() {
  const { isAnalyzing } = useAnalysis();
  const [senderMap, setSenderMap] = useState<Map<string, TableSender>>(new Map());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const hasHydratedRef = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log('[useSenderData] Hook state:', {
      senderMapSize: senderMap.size,
      isInitialLoading,
      hasHydrated: hasHydratedRef.current,
      isAnalyzing
    });
  }, [senderMap.size, isInitialLoading, isAnalyzing]);

  // Memoize the array conversion to prevent unnecessary re-renders
  const senders = useMemo(() => Array.from(senderMap.values()), [senderMap]);

  // Merge new senders into the existing map - STABLE function
  const mergeSenders = useCallback((newSenders: SenderResult[]) => {
    console.log('[useSenderData] Merging senders:', newSenders.length);
    setSenderMap(prevMap => {
      const newMap = new Map(prevMap);
      let hasChanges = false;

      newSenders.forEach(sender => {
        const existing = newMap.get(sender.senderEmail);
        const converted = convertToTableFormat(sender);

        // Only update if the sender is new or has changes
        if (!existing || 
            existing.count !== converted.count || 
            existing.lastEmail !== converted.lastEmail ||
            existing.actionsTaken.length !== converted.actionsTaken.length) {
          newMap.set(sender.senderEmail, converted);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        console.log('[useSenderData] Sender map updated, new size:', newMap.size);
      }
      return hasChanges ? newMap : prevMap;
    });
  }, []); // Remove dependencies to make it stable

  // Load initial data from IndexedDB only once - STABLE function
  const hydrateFromStorage = useCallback(async () => {
    if (hasHydratedRef.current) {
      console.log('[useSenderData] Already hydrated, skipping');
      return;
    }
    
    try {
      console.log('[useSenderData] Starting initial hydration from IndexedDB...');
      const senders = await getAllSenders();
      
      if (senders.length > 0) {
        console.log('[useSenderData] Found', senders.length, 'senders in storage');
        setSenderMap(new Map(senders.map(s => [s.senderEmail, convertToTableFormat(s)])));
      } else {
        console.log('[useSenderData] No senders found in storage');
      }
      
      hasHydratedRef.current = true;
      console.log('[useSenderData] Hydration complete');
    } catch (error) {
      console.error('[useSenderData] Hydration failed:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, []); // Remove dependencies to make it stable

  // Handle analysis changes - STABLE event handler
  useEffect(() => {
    const handleAnalysisChange = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.type === 'senders') {
        console.log('[useSenderData] Batch update received');
        getAllSenders().then(senders => {
          console.log('[useSenderData] Analysis change - updating with', senders.length, 'senders');
          mergeSenders(senders);
        });
      }
    };

    window.addEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    return () => {
      window.removeEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    };
  }, []); // Remove dependencies since mergeSenders is now stable

  // Initial hydration - MOUNT ONLY
  useEffect(() => {
    hydrateFromStorage();
  }, []); // Mount only since hydrateFromStorage is now stable

  return {
    senders,
    isLoading: isInitialLoading && senderMap.size === 0,
    isAnalyzing,
    refresh: hydrateFromStorage
  };
} 