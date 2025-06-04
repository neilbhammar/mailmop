import React from 'react';
import InboxStats from './overview/InboxStats';
import ReanalyzeButton from './overview/ReanalyzeButton';
import ProcessQueue from './queue/ProcessQueue';
import { useAnalysis } from '@/context/AnalysisProvider';

export default function Overview() {
  const { hasAnalysis, isAnalyzing } = useAnalysis();

  return (
    <div className="mt-2 mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Declutter Your Inbox</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Analyze senders, find clutter, and take back control.</p>
        </div>
        <ReanalyzeButton />
      </div>

      {/* Stats and Queue Section */}
      <div className="mt-0 flex items-center">
        <div className="flex-1">
          <InboxStats />
        </div>
        <div className="flex justify-end items-center h-[60px]">
          <ProcessQueue />
        </div>
      </div>
    </div>
  );
}
