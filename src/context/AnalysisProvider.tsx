'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { hasSenderAnalysis, ANALYSIS_CHANGE_EVENT } from '@/lib/storage/senderAnalysis';
import { getCurrentAnalysis, completeAnalysis } from '@/lib/storage/actionLog';
import { ActionEndType, LocalActionLog } from '@/types/actions';
import { logger } from '@/lib/utils/logger';

interface AnalysisContextType {
  hasAnalysis: boolean;
  isAnalyzing: boolean;
  checkAnalysisState: () => Promise<void>;
  currentAnalysis: LocalActionLog | null;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisStatus, setLastAnalysisStatus] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisContextType['currentAnalysis']>(null);

  // Function to check both IndexedDB and current analysis state
  const checkAnalysisState = useCallback(async () => {
    try {
      logger.debug('Checking analysis state', { component: 'AnalysisProvider' });
      
      const [hasData, analysis] = await Promise.all([
        hasSenderAnalysis(),
        getCurrentAnalysis()
      ]);

      const currentStatus = analysis?.status || null;
      
      // Log state changes
      if (hasData !== hasAnalysis || currentStatus !== lastAnalysisStatus) {
        logger.debug('State updated', { 
          component: 'AnalysisProvider',
          hasData,
          status: currentStatus,
          currentIsAnalyzing: isAnalyzing
        });
      }

      // Always update hasAnalysis immediately
      setHasAnalysis(hasData);
      setLastAnalysisStatus(currentStatus);
      setCurrentAnalysis(analysis);
      
      // Set isAnalyzing based on analysis status - updating immediately
      const newIsAnalyzing = 
        analysis?.status === 'started' || 
        analysis?.status === 'analyzing';
        
      if (isAnalyzing !== newIsAnalyzing) {
        logger.debug('Updating isAnalyzing state', { 
          component: 'AnalysisProvider',
          from: isAnalyzing,
          to: newIsAnalyzing
        });
        setIsAnalyzing(newIsAnalyzing);
        
        // If analysis just completed (was analyzing, now not analyzing),
        // dispatch an additional event to ensure UI updates
        if (isAnalyzing && !newIsAnalyzing) {
          logger.debug('Analysis just completed, dispatching immediate update', { 
            component: 'AnalysisProvider' 
          });
          window.dispatchEvent(new Event('mailmop:analysis-status-change'));
        }
      }
      
      // Check for interrupted analysis on page refresh/load
      if (analysis?.status === 'started' || analysis?.status === 'analyzing') {
        // Use last_update_time instead of start_time to check for activity
        const lastUpdated = new Date(analysis.last_update_time || analysis.start_time);
        const now = new Date();
        const timeSinceUpdate = now.getTime() - lastUpdated.getTime();
        
        // If analysis hasn't been updated in more than 60 seconds, consider it interrupted
        if (timeSinceUpdate > 60000) {
          logger.debug('Analysis appears interrupted, marking as error', { 
            component: 'AnalysisProvider',
            timeSinceUpdateSeconds: Math.round(timeSinceUpdate/1000)
          });
          completeAnalysis('error' as ActionEndType, 'Analysis was interrupted by page refresh');
          setIsAnalyzing(false);
          
          // Dispatch event to notify other components
          window.dispatchEvent(new Event('mailmop:analysis-status-change'));
        } else {
          logger.debug('Analysis still active', { 
            component: 'AnalysisProvider',
            lastUpdatedSeconds: Math.round(timeSinceUpdate/1000)
          });
        }
      }
    } catch (error) {
      logger.error('Error checking analysis state', { 
        component: 'AnalysisProvider', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [hasAnalysis, isAnalyzing, lastAnalysisStatus]);

  // Poll for status changes when analyzing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (isAnalyzing) {
      // Poll every 2 seconds while analyzing
      interval = setInterval(() => {
        logger.debug('Polling for analysis status', { component: 'AnalysisProvider' });
        checkAnalysisState();
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing, checkAnalysisState]);

  useEffect(() => {
    // Initial check
    checkAnalysisState();

    // Handle window focus - only check state if we might have an active analysis
    const handleFocus = () => {
      // Only check state on focus if we're currently analyzing or might have missed updates
      if (isAnalyzing) {
        logger.debug('Window focused during analysis, checking state', { 
          component: 'AnalysisProvider' 
        });
        checkAnalysisState();
      }
    };

    // Handle analysis changes from other components
    const handleAnalysisChange = () => {
      logger.debug('Analysis data changed, updating state', { 
        component: 'AnalysisProvider' 
      });
      checkAnalysisState();
      
      // Double-check after a short delay to catch all updates
      setTimeout(() => {
        checkAnalysisState();
      }, 100);
    };

    // Add listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    window.addEventListener('mailmop:analysis-status-change', handleAnalysisChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
      window.removeEventListener('mailmop:analysis-status-change', handleAnalysisChange);
    };
  }, [checkAnalysisState]);

  const value = {
    hasAnalysis,
    isAnalyzing,
    checkAnalysisState,
    currentAnalysis
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
} 