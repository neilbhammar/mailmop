'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { hasSenderAnalysis, ANALYSIS_CHANGE_EVENT } from '@/lib/storage/senderAnalysis';
import { getCurrentAnalysis, completeAnalysis } from '@/lib/storage/actionLog';
import { ActionEndType, LocalActionLog } from '@/types/actions';

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
      console.log('[AnalysisProvider] Checking analysis state...');
      
      const [hasData, analysis] = await Promise.all([
        hasSenderAnalysis(),
        getCurrentAnalysis()
      ]);

      const currentStatus = analysis?.status || null;
      
      // Log state changes
      if (hasData !== hasAnalysis || currentStatus !== lastAnalysisStatus) {
        console.log(`[AnalysisProvider] State updated: hasData=${hasData}, status=${currentStatus}, current isAnalyzing=${isAnalyzing}`);
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
        console.log(`[AnalysisProvider] Updating isAnalyzing from ${isAnalyzing} to ${newIsAnalyzing}`);
        setIsAnalyzing(newIsAnalyzing);
        
        // If analysis just completed (was analyzing, now not analyzing),
        // dispatch an additional event to ensure UI updates
        if (isAnalyzing && !newIsAnalyzing) {
          console.log('[AnalysisProvider] Analysis just completed, dispatching immediate update');
          window.dispatchEvent(new Event('mailmop:analysis-status-change'));
        }
      }
      
      // Check for interrupted analysis on page refresh/load
      if (analysis?.status === 'started' || analysis?.status === 'analyzing') {
        // Use last_update_time instead of start_time to check for activity
        const lastUpdated = new Date(analysis.last_update_time || analysis.start_time);
        const now = new Date();
        const timeSinceUpdate = now.getTime() - lastUpdated.getTime();
        
        // If analysis hasn't been updated in more than 15 seconds, consider it interrupted
        if (timeSinceUpdate > 15000) {
          console.log(`[AnalysisProvider] Analysis hasn't been updated for ${Math.round(timeSinceUpdate/1000)}s, marking as interrupted`);
          completeAnalysis('error' as ActionEndType, 'Analysis was interrupted by page refresh');
          setIsAnalyzing(false);
          
          // Dispatch event to notify other components
          window.dispatchEvent(new Event('mailmop:analysis-status-change'));
        } else {
          console.log(`[AnalysisProvider] Analysis still active, last updated ${Math.round(timeSinceUpdate/1000)}s ago`);
        }
      }
    } catch (error) {
      console.error('[AnalysisProvider] Error checking state:', error);
    }
  }, [hasAnalysis, isAnalyzing, lastAnalysisStatus]);

  // Poll for status changes when analyzing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (isAnalyzing) {
      // Poll every 2 seconds while analyzing
      interval = setInterval(() => {
        console.log('[AnalysisProvider] Polling for analysis status...');
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
        console.log('[Analysis] Window focused during analysis, checking state');
        checkAnalysisState();
      }
    };

    // Handle analysis changes from other components
    const handleAnalysisChange = () => {
      console.log('[Analysis] Analysis data changed, updating state');
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