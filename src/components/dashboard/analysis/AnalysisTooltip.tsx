"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getCurrentAnalysis } from '@/lib/storage/actionLog'
import { formatRelativeTime, formatDuration } from '@/lib/utils/formatRelativeTime'
import { useEffect, useState } from 'react'
import { useAnalysis } from '@/context/AnalysisProvider'
import { LocalActionLog } from '@/types/actions'
import { AlertCircle, AlertTriangle } from 'lucide-react'

export function AnalysisTooltip() {
  const { isAnalyzing, checkAnalysisState, currentAnalysis } = useAnalysis();
  const [lastAnalysis, setLastAnalysis] = useState<LocalActionLog | null>(null);
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Update analysis data and relative time
  useEffect(() => {
    const updateAnalysisData = () => {
      console.log('[AnalysisTooltip] Updating analysis data');
      // Only update lastAnalysis if we're not currently analyzing
      if (!isAnalyzing) {
        const current = getCurrentAnalysis();
        setLastAnalysis(current);
        
        if (current?.completed_at) {
          setRelativeTime(formatRelativeTime(current.completed_at));
        }
      }
    };

    // Update immediately
    updateAnalysisData();

    // Update relative time every minute
    const interval = setInterval(updateAnalysisData, 60000);

    // Also listen for analysis status changes
    const handleAnalysisStatusChange = () => {
      console.log('[AnalysisTooltip] Analysis status changed, updating tooltip');
      // Check analysis state first to ensure isAnalyzing is updated
      checkAnalysisState().then(() => {
        // Then update our tooltip data
        updateAnalysisData();
      });
    };

    window.addEventListener('mailmop:analysis-status-change', handleAnalysisStatusChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mailmop:analysis-status-change', handleAnalysisStatusChange);
    };
  }, [checkAnalysisState]);

  // Refresh tooltip when isAnalyzing changes
  useEffect(() => {
    console.log(`[AnalysisTooltip] isAnalyzing changed to ${isAnalyzing}`);
    
    // When analysis completes, update data right away
    if (!isAnalyzing) {
      const current = getCurrentAnalysis();
      setLastAnalysis(current);
      
      if (current?.completed_at) {
        setRelativeTime(formatRelativeTime(current.completed_at));
      }
    }
  }, [isAnalyzing]);

  const getAnalysisStatus = () => {
    if (isAnalyzing) return "Analysis in Progress";
    if (!lastAnalysis?.completed_at) return null;
    return relativeTime;
  };

  // Format date for tooltip
  const getFormattedDate = () => {
    if (isAnalyzing) {
      return currentAnalysis?.start_time ? 
        new Date(currentAnalysis.start_time).toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).replace(',', '') : 'In Progress';
    }
    
    if (!lastAnalysis?.completed_at) return 'N/A';
    return new Date(lastAnalysis.completed_at).toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(',', '');
  };

  // Calculate runtime if available
  const getRuntime = () => {
    if (isAnalyzing) {
      if (!currentAnalysis?.start_time) return 'In Progress';
      const runtime = new Date().getTime() - new Date(currentAnalysis.start_time).getTime();
      return formatDuration(runtime);
    }

    if (!lastAnalysis?.completed_at || !lastAnalysis?.start_time) return 'N/A';
    const runtime = new Date(lastAnalysis.completed_at).getTime() - new Date(lastAnalysis.start_time).getTime();
    return formatDuration(runtime);
  };

  const status = getAnalysisStatus();
  if (!status) return null;

  // Check if the last analysis was incomplete (any end_type other than 'success')
  const isIncomplete = !isAnalyzing && lastAnalysis?.end_type && lastAnalysis.end_type !== 'success';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="border-b border-dotted border-slate-300 dark:border-slate-600 pb-[1px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1">
            {isIncomplete && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
            {isAnalyzing ? `${status}` : `Last Analyzed: ${status}`}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          sideOffset={5}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.03)] dark:shadow-md dark:shadow-black/30 border border-slate-200 dark:border-slate-700 p-0 w-[320px] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100">
              Analysis Details{isIncomplete ? ' - Incomplete' : ''}
            </h3>
          </div>
          <div className="px-4 py-2 space-y-1">
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500 dark:text-slate-400">Date & Time</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{getFormattedDate()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500 dark:text-slate-400">Emails Analyzed</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {isAnalyzing 
                  ? (currentAnalysis?.processed_email_count?.toLocaleString() || '0') + ' (In Progress)'
                  : lastAnalysis?.processed_email_count?.toLocaleString() || '0'
                }
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500 dark:text-slate-400">Analysis Type</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {isAnalyzing 
                  ? (currentAnalysis?.filters?.type === 'quick' ? 'Quick' : 'Full') 
                  : (lastAnalysis?.filters?.type === 'quick' ? 'Quick' : 'Full')
                }
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {isAnalyzing 
                  ? 'In Progress'
                  : (lastAnalysis?.end_type || 'Completed')
                }
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500 dark:text-slate-400">Run Time</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{getRuntime()}</span>
            </div>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">Analysis ID</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate text-right">
                {isAnalyzing 
                  ? (currentAnalysis?.client_action_id || 'N/A')
                  : (lastAnalysis?.client_action_id || 'N/A')
                }
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 