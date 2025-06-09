import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SenderResult } from '@/types/gmail';
import { getAllSenders, ANALYSIS_CHANGE_EVENT } from '@/lib/storage/senderAnalysis';
import { useAnalysis } from '@/context/AnalysisProvider';
import { logger } from '@/lib/utils/logger';

// Valid action types - using the full ActionType from actions module
import { ActionType } from '@/types/actions';

// Convert SenderResult to table-friendly format
function convertToTableFormat(sender: SenderResult) {
  // Keep all actions without filtering - the actions types handle this
  const validActions = sender.actionsTaken || [];

  return {
    email: sender.senderEmail,
    name: sender.senderName,
    // Include multiple names for tooltip (Option 1 implementation)
    allNames: sender.senderNames,
    hasMultipleNames: !!(sender.senderNames && sender.senderNames.length > 0),
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
  // Multiple names support for Option 1
  allNames?: string[];
  hasMultipleNames: boolean;
  count: number;
  unread_count: number;
  lastEmail: string;
  actionsTaken: any;
  hasUnsubscribe: boolean;
  unsubscribe?: {
    // Original header data
    mailto?: string;
    url?: string;
    requiresPost?: boolean;
    
    // Enriched data (append-only)
    enrichedUrl?: string;
    enrichedAt?: number;
    firstMessageId?: string;
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
    logger.debug('Hook state update', {
      component: 'useSenderData',
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
    logger.debug('Merging senders', { 
      component: 'useSenderData',
      newSendersCount: newSenders.length 
    });
    setSenderMap(prevMap => {
      const newMap = new Map(prevMap);
      let hasChanges = false;

      newSenders.forEach(sender => {
        const existing = newMap.get(sender.senderEmail);
        const converted = convertToTableFormat(sender);

        // Only update if the sender is new or has changes
        if (!existing || 
            existing.count !== converted.count || 
            existing.unread_count !== converted.unread_count ||
            existing.lastEmail !== converted.lastEmail ||
            existing.actionsTaken.length !== converted.actionsTaken.length ||
            existing.name !== converted.name ||
            existing.hasMultipleNames !== converted.hasMultipleNames) {
          newMap.set(sender.senderEmail, converted);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        logger.debug('Sender map updated', { 
          component: 'useSenderData',
          newSize: newMap.size 
        });
      }
      return hasChanges ? newMap : prevMap;
    });
  }, []); // Remove dependencies to make it stable

  // Load initial data from IndexedDB only once - STABLE function
  const hydrateFromStorage = useCallback(async () => {
    if (hasHydratedRef.current) {
      logger.debug('Already hydrated, skipping', { component: 'useSenderData' });
      return;
    }
    
    try {
      logger.debug('Starting initial hydration from IndexedDB', { component: 'useSenderData' });
      const senders = await getAllSenders();
      
      if (senders.length > 0) {
        logger.debug('Found senders in storage', { 
          component: 'useSenderData',
          sendersCount: senders.length,
          sampleEmails: senders.slice(0, 5).map(s => s.senderEmail)
        });
        setSenderMap(new Map(senders.map(s => [s.senderEmail, convertToTableFormat(s)])));
      } else {
        logger.debug('No senders found in storage', { component: 'useSenderData' });
      }
      
      hasHydratedRef.current = true;
      logger.debug('Hydration complete', { component: 'useSenderData' });
    } catch (error) {
      logger.error('Hydration failed', { 
        component: 'useSenderData',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, []); // Remove dependencies to make it stable

  // Handle analysis changes - STABLE event handler
  useEffect(() => {
    const handleAnalysisChange = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.type === 'senders') {
        logger.debug('Batch update received', { component: 'useSenderData' });
        getAllSenders().then(senders => {
          logger.debug('Analysis change - updating with senders', { 
            component: 'useSenderData',
            sendersCount: senders.length 
          });
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