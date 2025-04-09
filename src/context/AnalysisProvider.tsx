'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { hasStoredAnalysis, STORAGE_CHANGE_EVENT } from '@/lib/gmail/tokenStorage';

interface AnalysisContextType {
  hasAnalysis: boolean;
  setAnalysisData: (data: any | null) => void;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  // Initialize with false for SSR, then check localStorage after mount
  const [hasAnalysis, setHasAnalysis] = useState(false);

  // Initialize state after mount
  useEffect(() => {
    setHasAnalysis(hasStoredAnalysis());
  }, []);

  // Handle setting analysis data - syncs with localStorage
  const setAnalysisData = useCallback((newData: any | null) => {
    if (typeof window === 'undefined') return; // Guard against SSR

    console.log('[Analysis] Updating analysis data:', { hasData: !!newData });
    
    if (newData) {
      localStorage.setItem('email_analysis', JSON.stringify(newData));
    } else {
      localStorage.removeItem('email_analysis');
    }
    
    // Update our state
    setHasAnalysis(!!newData);
    
    // Dispatch our custom event
    window.dispatchEvent(
      new CustomEvent(STORAGE_CHANGE_EVENT, { 
        detail: { key: 'email_analysis' } 
      })
    );
  }, []);

  // Listen for both focus and custom events
  useEffect(() => {
    if (typeof window === 'undefined') return; // Guard against SSR

    const handleStorageChange = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { key } = e.detail as { key: string };
        if (key === 'email_analysis') {
          console.log('[Analysis] Storage changed, updating state');
          setHasAnalysis(hasStoredAnalysis());
        }
      }
    };

    const handleFocus = () => {
      console.log('[Analysis] Window focused, checking storage');
      setHasAnalysis(hasStoredAnalysis());
    };

    // Add both listeners
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const value = {
    hasAnalysis,
    setAnalysisData
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