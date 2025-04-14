'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { hasSenderAnalysis, ANALYSIS_CHANGE_EVENT } from '@/lib/storage/senderAnalysis';
import { getCurrentAnalysis } from '@/lib/storage/actionLog';

interface AnalysisContextType {
  hasAnalysis: boolean;
  isAnalyzing: boolean;
  checkAnalysisState: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisStatus, setLastAnalysisStatus] = useState<string | null>(null);

  // Function to check both IndexedDB and current analysis state
  const checkAnalysisState = useCallback(async () => {
    try {
      console.log('[AnalysisProvider] Checking analysis state...');
      
      const [hasData, currentAnalysis] = await Promise.all([
        hasSenderAnalysis(),
        getCurrentAnalysis()
      ]);

      const currentStatus = currentAnalysis?.status || null;
      
      // Log state changes
      if (hasData !== hasAnalysis || currentStatus !== lastAnalysisStatus) {
        console.log(`[AnalysisProvider] State updated: hasData=${hasData}, status=${currentStatus}`);
      }

      setHasAnalysis(hasData);
      setLastAnalysisStatus(currentStatus);
      
      // Consider analyzing if current analysis is in progress
      setIsAnalyzing(
        currentAnalysis?.status === 'started' || 
        currentAnalysis?.status === 'analyzing'
      );
    } catch (error) {
      console.error('[AnalysisProvider] Error checking state:', error);
    }
  }, [hasAnalysis, lastAnalysisStatus]);

  // Poll for status changes when analyzing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
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

    // Handle window focus
    const handleFocus = () => {
      console.log('[Analysis] Window focused, checking state');
      checkAnalysisState();
    };

    // Handle analysis changes from other components
    const handleAnalysisChange = () => {
      console.log('[Analysis] Analysis data changed, updating state');
      checkAnalysisState();
      
      // Double-check after a short delay to catch all updates
      setTimeout(() => {
        checkAnalysisState();
      }, 500);
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
    checkAnalysisState
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