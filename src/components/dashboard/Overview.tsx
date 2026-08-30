import React from 'react';
import InboxStats from './overview/InboxStats';
import ReanalyzeButton from './overview/ReanalyzeButton';
import ProcessQueue from './queue/ProcessQueue';
import { useAnalysis } from '@/context/AnalysisProvider';

export default function Overview() {
  const { hasAnalysis, isAnalyzing } = useAnalysis();

  return (
    <div className="mt-1 mb-3 sm:mt-2 sm:mb-8">
      {/* Mobile: single compact row (title + reanalyze), no subheader — every
          pixel saved here pushes the sender table above the fold */}
      <div className="flex flex-wrap justify-between items-center sm:items-start gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">Declutter Your Inbox</h1>
          <p className="hidden sm:block text-slate-500 dark:text-slate-400 mt-1">Analyze senders, find clutter, and take back control.</p>
        </div>
        <ReanalyzeButton />
      </div>

      {/* Stats and Queue Section — the queue widget wraps below the stats on
          narrow screens instead of crushing them.

          gap-y matters here: during an analysis the queue pill grows to
          w-[min(400px,calc(100vw-3rem))], which together with the stats'
          min-w-[240px] guarantees a wrap on any phone. Without a vertical gap the
          60px pill sat flush against the stats row. */}
      <div className="mt-0 flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-y-0">
        <div className="flex-1 min-w-[240px]">
          <InboxStats />
        </div>
        {/* Full width once wrapped, so the pill lines up with the stats above it
            rather than floating as a near-full-width block pushed to the right */}
        <div className="flex w-full sm:w-auto justify-start sm:justify-end items-center sm:h-[60px] shrink-0 sm:ml-auto">
          <ProcessQueue />
        </div>
      </div>
    </div>
  );
}
