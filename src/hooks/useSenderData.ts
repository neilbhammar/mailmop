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
    lastEmail: sender.lastDate,
    actionsTaken: validActions,
    // Include additional metadata for actions
    hasUnsubscribe: sender.hasUnsubscribe || false,
    unsubscribe: sender.unsubscribe,
    messageIds: sender.messageIds || [],
    sampleSubjects: sender.sampleSubjects || []
  };
}

export type TableSender = ReturnType<typeof convertToTableFormat>;

export function useSenderData() {
  const { isAnalyzing } = useAnalysis();
  const [senderMap, setSenderMap] = useState<Map<string, TableSender>>(new Map());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const hasHydratedRef = useRef(false);

  // Memoize the array conversion to prevent unnecessary re-renders
  const senders = useMemo(() => Array.from(senderMap.values()), [senderMap]);

  // Merge new senders into the existing map
  const mergeSenders = useCallback((newSenders: SenderResult[]) => {
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

      return hasChanges ? newMap : prevMap;
    });
  }, []);

  // Load initial data from IndexedDB only once
  const hydrateFromStorage = useCallback(async () => {
    if (hasHydratedRef.current) return;
    
    try {
      console.log('[useSenderData] Initial hydration from IndexedDB...');
      const senders = await getAllSenders();
      
      if (senders.length > 0) {
        mergeSenders(senders);
      }
      
      hasHydratedRef.current = true;
    } catch (error) {
      console.error('[useSenderData] Hydration failed:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [mergeSenders]);

  // Handle analysis changes
  useEffect(() => {
    const handleAnalysisChange = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.type === 'senders') {
        console.log('[useSenderData] Batch update received');
        getAllSenders().then(senders => {
          mergeSenders(senders);
        });
      }
    };

    window.addEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    return () => {
      window.removeEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    };
  }, [mergeSenders]);

  // Initial hydration
  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return {
    senders,
    isLoading: isInitialLoading && senderMap.size === 0,
    isAnalyzing,
    refresh: hydrateFromStorage
  };
} 