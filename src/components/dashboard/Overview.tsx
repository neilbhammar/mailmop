import React from 'react';
import InboxStats from './overview/InboxStats';
import ReanalyzeButton from './overview/ReanalyzeButton';
import ProcessQueue from './queue/ProcessQueue';
import { useAnalysis } from '@/context/AnalysisProvider';

export default function Overview() {
  const { hasAnalysis, isAnalyzing } = useAnalysis();

  return (
    <div className="mt-2 mb-4 sm:mb-8">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">Declutter Your Inbox</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">Analyze senders, find clutter, and take back control.</p>
        </div>
        <ReanalyzeButton />
      </div>

      {/* Stats and Queue Section — the queue widget wraps below the stats on
          narrow screens instead of crushing them */}
      <div className="mt-0 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <InboxStats />
        </div>
        <div className="flex justify-end items-center h-[60px] shrink-0 ml-auto">
          <ProcessQueue />
        </div>
      </div>
    </div>
  );
}
