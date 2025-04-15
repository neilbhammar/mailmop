"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnalysisTooltip } from "./AnalysisTooltip"

export function AnalysisHeader() {
  return (
    <div className="px-4 pt-6 pb-4 flex justify-between items-start shrink-0">
      <div>
        <h1 className="text-xl font-bold mb-3">Email Senders</h1>
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <AnalysisTooltip />
          <span className="pb-[1px]">| 0 emails from 563 senders</span>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input 
            placeholder="Search senders..." 
            className="w-[240px] h-9 text-sm bg-white border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-100 pl-9" 
          />
        </div>
        <Button 
          variant="outline" 
          className="h-9 px-4 text-sm font-normal border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </Button>
      </div>
    </div>
  )
} 