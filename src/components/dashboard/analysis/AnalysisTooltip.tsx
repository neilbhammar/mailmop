"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function AnalysisTooltip() {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="border-b border-dotted border-slate-300 pb-[1px] cursor-pointer hover:text-slate-700 transition-colors">
            Last Analyzed: 4/12/2025
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          sideOffset={5}
          className="bg-white rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-slate-200 p-0 w-[280px] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-medium text-sm text-slate-900">Analysis Details</h3>
          </div>
          <div className="px-4 py-2 space-y-1">
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Date & Time</span>
              <span className="text-sm text-slate-700">Apr 12, 2025, 2:00PM</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Emails Analyzed</span>
              <span className="text-sm text-slate-700">0</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Unique Senders</span>
              <span className="text-sm text-slate-700">563</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Active Filters</span>
              <span className="text-sm text-slate-700">None</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-500">Run Time</span>
              <span className="text-sm text-slate-700">2m 10s</span>
            </div>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Analysis ID</span>
              <span className="text-xs font-mono text-slate-500">abc123</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 