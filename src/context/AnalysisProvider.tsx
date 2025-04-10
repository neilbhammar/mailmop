'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { hasSenderAnalysis, ANALYSIS_CHANGE_EVENT } from '@/lib/storage/senderAnalysis';

interface AnalysisContextType {
  hasAnalysis: boolean;
  checkAnalysisState: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [hasAnalysis, setHasAnalysis] = useState(false);

  // Function to check IndexedDB state
  const checkAnalysisState = useCallback(async () => {
    const hasData = await hasSenderAnalysis();
    setHasAnalysis(hasData);
  }, []);

  // Check for analysis data on mount and window focus
  useEffect(() => {
    // Initial check
    checkAnalysisState();

    // Handle window focus
    const handleFocus = () => {
      console.log('[Analysis] Window focused, checking IndexedDB');
      checkAnalysisState();
    };

    // Handle analysis changes from other components
    const handleAnalysisChange = () => {
      console.log('[Analysis] Analysis data changed, updating state');
      checkAnalysisState();
    };

    // Add listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(ANALYSIS_CHANGE_EVENT, handleAnalysisChange);
    };
  }, [checkAnalysisState]);

  const value = {
    hasAnalysis,
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