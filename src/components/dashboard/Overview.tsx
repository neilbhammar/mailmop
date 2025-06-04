import React, { useState } from 'react';
import InboxStats from './overview/InboxStats';
import ReanalyzeButton from './overview/ReanalyzeButton';
import ProcessQueue from './queue/ProcessQueue';
import { useAnalysis } from '@/context/AnalysisProvider';
import { Button } from '@/components/ui/button';
import { MarkAsReadConfirmModal } from '@/components/modals/MarkAsReadConfirmModal';

export default function Overview() {
  const { hasAnalysis, isAnalyzing } = useAnalysis();
  
  // State for testing the MarkAsReadConfirmModal with queue integration
  const [showMarkReadModal, setShowMarkReadModal] = useState(false);

  // Test data for the modal
  const testSenders = ['newsletter@example.com', 'promotions@store.com', 'notifications@app.com'];
  const testUnreadCountMap = {
    'newsletter@example.com': 45,
    'promotions@store.com': 23,
    'notifications@app.com': 12
  };
  const totalUnreadCount = Object.values(testUnreadCountMap).reduce((sum, count) => sum + count, 0);

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
          <div className="flex items-center gap-2">
            {/* Test button for MarkAsReadConfirmModal */}
            <Button 
              onClick={() => setShowMarkReadModal(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              🧪 Test Queue
            </Button>
            <ProcessQueue />
          </div>
        </div>
      </div>

      {/* Test MarkAsReadConfirmModal with Queue Integration */}
      <MarkAsReadConfirmModal
        open={showMarkReadModal}
        onOpenChange={setShowMarkReadModal}
        unreadCount={totalUnreadCount}
        senderCount={testSenders.length}
        senders={testSenders}
        unreadCountMap={testUnreadCountMap}
        // Note: No onConfirm prop - modal will use queue system automatically
      />
    </div>
  );
}
