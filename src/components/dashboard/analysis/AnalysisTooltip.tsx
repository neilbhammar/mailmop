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

export function AnalysisTooltip() {
  const { isAnalyzing } = useAnalysis();
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Update analysis data and relative time
  useEffect(() => {
    const updateAnalysisData = () => {
      const current = getCurrentAnalysis();
      setLastAnalysis(current);
      
      if (current?.completed_at) {
        setRelativeTime(formatRelativeTime(current.completed_at));
      }
    };

    // Update immediately
    updateAnalysisData();

    // Update relative time every minute
    const interval = setInterval(updateAnalysisData, 60000);

    return () => clearInterval(interval);
  }, []);

  const getAnalysisStatus = () => {
    if (isAnalyzing) return "Analysis in Progress";
    if (!lastAnalysis?.completed_at) return null;
    return relativeTime;
  };

  // Format date for tooltip
  const getFormattedDate = () => {
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
    if (!lastAnalysis?.completed_at || !lastAnalysis?.start_time) return 'N/A';
    const runtime = new Date(lastAnalysis.completed_at).getTime() - new Date(lastAnalysis.start_time).getTime();
    return formatDuration(runtime);
  };

  const status = getAnalysisStatus();
  if (!status) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="border-b border-dotted border-slate-300 pb-[1px] cursor-pointer hover:text-slate-700 transition-colors">
            {isAnalyzing ? `${status}` : `Last Analyzed: ${status}`}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          sideOffset={5}
          className="bg-white rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-slate-200 p-0 w-[320px] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-medium text-sm text-slate-900">Analysis Details</h3>
          </div>
          <div className="px-4 py-2 space-y-1">
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Date & Time</span>
              <span className="text-sm text-slate-700">{getFormattedDate()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Emails Analyzed</span>
              <span className="text-sm text-slate-700">{lastAnalysis?.processed_email_count?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Analysis Type</span>
              <span className="text-sm text-slate-700">{lastAnalysis?.type === 'quick' ? 'Quick' : 'Full'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Status</span>
              <span className="text-sm text-slate-700">{lastAnalysis?.end_type || 'Completed'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Run Time</span>
              <span className="text-sm text-slate-700">{getRuntime()}</span>
            </div>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-slate-400 shrink-0">Analysis ID</span>
              <span className="text-[10px] font-mono text-slate-500 truncate text-right">{lastAnalysis?.client_action_id || 'N/A'}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 