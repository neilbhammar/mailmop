import React from 'react';
import InboxStats from './overview/InboxStats';

export default function Overview() {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Clean Up Your Inbox</h1>
          <p className="text-slate-500 mt-1">Analyze senders, find clutter, and take control.</p>
        </div>
      </div>

      {/* Stats Section */}
      <InboxStats />
    </div>
  );
}
