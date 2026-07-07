import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { hasSenderAnalysis, ANALYSIS_CHANGE_EVENT } from '@/lib/storage/senderAnalysis';
import { getCurrentAnalysis, completeAnalysis } from '@/lib/storage/actionLog';
import { ActionEndType, LocalActionLog } from '@/types/actions';
import { eventBus } from '@/lib/events';
import { ANALYSIS_STATUS_CHANGE_EVENT } from '@shared/constants/events';

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
  const [currentAnalysis, setCurrentAnalysis] = useState<LocalActionLog | null>(null);

  const checkAnalysisState = useCallback(async () => {
    const [hasData, analysis] = await Promise.all([hasSenderAnalysis(), getCurrentAnalysis()]);
    setHasAnalysis(hasData);
    setCurrentAnalysis(analysis);

    const analyzing =
      analysis?.status === 'started' || analysis?.status === 'analyzing';
    setIsAnalyzing(analyzing);

    if (analyzing && analysis) {
      const lastUpdated = new Date(analysis.last_update_time || analysis.start_time);
      const timeSinceUpdate = Date.now() - lastUpdated.getTime();
      if (timeSinceUpdate > 60000) {
        await completeAnalysis('runtime_error' as ActionEndType, 'Analysis was interrupted');
        setIsAnalyzing(false);
      }
    }
  }, []);

  useEffect(() => {
    checkAnalysisState();
    const unsub1 = eventBus.on(ANALYSIS_CHANGE_EVENT, checkAnalysisState);
    const unsub2 = eventBus.on(ANALYSIS_STATUS_CHANGE_EVENT, checkAnalysisState);
    return () => {
      unsub1();
      unsub2();
    };
  }, [checkAnalysisState]);

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(checkAnalysisState, 2000);
    return () => clearInterval(interval);
  }, [isAnalyzing, checkAnalysisState]);

  return (
    <AnalysisContext.Provider
      value={{ hasAnalysis, isAnalyzing, checkAnalysisState, currentAnalysis }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}
