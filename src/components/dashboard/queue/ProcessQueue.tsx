import React, { useState, useRef, useEffect } from 'react';
import { 
  CircleIcon, 
  XIcon, 
  ChevronDownIcon, 
  AlertCircleIcon, 
  StopCircleIcon,
  CheckCircleIcon,
  InfoIcon
} from 'lucide-react';
import { Job, isDeleteJob, isDeleteWithExceptionsJob, isMarkReadJob } from '@/types/queue';
import { ActionType } from '@/types/actions';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueue } from '@/hooks/useQueue';

// Helper for readable time format
const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return "~30 seconds"; // Never show 0, always show minimum
  
  if (ms < 60000) {
    // Less than 1 minute - show seconds
    const seconds = Math.max(30, Math.ceil(ms / 1000)); // Minimum 30 seconds
    return `~${seconds} seconds`;
  }
  
  const minutes = Math.ceil(ms / 60000);
  return `~${minutes} minute${minutes === 1 ? '' : 's'}`;
};

// Progress circle component
function DetailedProgressCircle({ percentage, isCompleted }: { percentage: number, isCompleted?: boolean }) {
  const size = 24; 
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const dash = (percentage * circumference) / 100;

  if (isCompleted) {
    return (
      <div className="relative w-6 h-6 flex-shrink-0">
        <CheckCircleIcon className="w-full h-full text-green-500 dark:text-green-400" />
      </div>
    );
  }

  return (
    <div className="relative w-6 h-6 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          className="stroke-slate-100 dark:stroke-slate-700" 
          strokeWidth={strokeWidth}
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          className="stroke-blue-500 dark:stroke-blue-400" 
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - dash}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// Function to format email count
const formatEmailCount = (count: number) => {
  return count.toLocaleString();
};

// Get display title for a job
const getActionDisplayTitle = (job: Job): string => {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const baseTypeName = job.type.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  const senderCount = job.targetSenders?.length || 0;
  const senderText = senderCount > 0 ? `${senderCount} Sender${senderCount > 1 ? 's' : ''}` : '';

  if (senderCount > 0 && job.type !== 'analysis' && job.type !== 'createFilter') {
    switch (job.type) {
      case 'delete':
        return `Delete ${senderText}`;
      case 'deleteWithExceptions':
        return `Delete with exceptions for ${senderText}`;
      case 'markRead':
        return `Mark ${senderText} as Read`;
      case 'unsubscribe':
        return `Unsubscribe from ${senderText}`;
      case 'applyLabel':
        return `Apply label to ${senderText}`;
      default:
        return `${capitalize(baseTypeName)} for ${senderText}`;
    }
  }
  // Default title for analysis, createFilter, or actions without specified sender count
  return capitalize(baseTypeName);
};

// Map job status to action status for UI consistency
const getActionStatus = (job: Job): ActionType => {
  if (job.status === 'running') {
    switch (job.type) {
      case 'analysis':
        return 'analysis';
      case 'delete':
      case 'deleteWithExceptions':
        return 'delete';
      case 'markRead':
        return 'mark_as_read';
      case 'unsubscribe':
        return 'unsubscribe';
      case 'createFilter':
        return 'create_filter';
      case 'applyLabel':
        return 'modify_label';
      default:
        return 'other';
    }
  }
  return 'other';
};

export default function ProcessQueue() {
  const { 
    jobs, 
    currentJob, 
    queuedJobs, 
    completedJobs,
    cancel, 
    clearCompleted,
    counts 
  } = useQueue();
  
  const [open, setOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Find the most recently completed job (within last 5 seconds)
  const recentlyCompletedJob = completedJobs.find(job => {
    if (!job.finishedAt) return false;
    return Date.now() - job.finishedAt < 5000; // 5 seconds
  });

  // The "active" job is either currently running or recently completed
  const activeJob = currentJob || recentlyCompletedJob;

  // Force periodic re-renders when showing completed jobs so they auto-dismiss
  useEffect(() => {
    if (recentlyCompletedJob && !currentJob) {
      const interval = setInterval(() => {
        setRefreshTrigger(prev => prev + 1); // Force re-render
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [recentlyCompletedJob, currentJob]);

  // Calculate progress for active job
  const progressPercentage = activeJob
    ? activeJob.status === 'success' 
      ? 100 // Always show 100% for completed jobs
      : Math.min(
          Math.round((activeJob.progress.current / activeJob.progress.total) * 100) || 0,
          100 
        )
    : 0;
  
  // Estimate time remaining (only for running jobs)
  const timeRemainingMs = currentJob && currentJob.startedAt && currentJob.progress.total > 0
    ? (() => {
        const elapsed = Date.now() - currentJob.startedAt;
        const progressRatio = currentJob.progress.current / currentJob.progress.total;
        if (progressRatio === 0) return 0;
        const estimatedTotal = elapsed / progressRatio;
        return Math.max(0, estimatedTotal - elapsed);
      })()
    : 0;

  // Show "Keep tab open" badge for running jobs only
  const showKeepTabOpenBadge = !!currentJob;

  // Build trigger content based on current state
  const triggerContent = activeJob ? (
    // ACTIVE STATE DISPLAY
    <div className="flex items-center justify-between w-full h-full px-3 py-2">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <DetailedProgressCircle percentage={progressPercentage} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {getActionDisplayTitle(activeJob)}
            </div>
            {showKeepTabOpenBadge && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-full flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-700 dark:text-amber-300">Keep tab open</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="truncate">
              {formatEmailCount(activeJob.progress.current)} of ~{formatEmailCount(activeJob.progress.total)}
            </div>
            <div className="text-slate-400 dark:text-slate-500 flex-shrink-0">•</div>
            <div className="flex-shrink-0">
              {currentJob ? formatTimeRemaining(timeRemainingMs) : 
               activeJob.status === 'success' ? 'Completed' : 
               activeJob.status === 'error' ? 'Failed' : 'Finished'}
            </div>
            {counts.queued > 0 && (
              <>
                <div className="text-slate-400 dark:text-slate-500 flex-shrink-0">•</div>
                <div className="flex-shrink-0">{counts.queued} Queued</div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <ChevronDownIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
      </div>
    </div>
  ) : (
    // INACTIVE STATE DISPLAY
    <div className="flex items-center justify-center w-full h-full px-4">
      <CircleIcon className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500 mr-2" /> 
      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Process Queue</span>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 justify-end">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <div
              className={cn(
                "flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-300 ease-in-out cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 overflow-hidden",
                activeJob ? "w-[400px] h-[60px]" : "w-[150px] h-[40px]"
              )}
            >
              {triggerContent}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
              className="w-[400px] shadow-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" 
              align="end"
              sideOffset={5}
          >
            {/* Queue Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Processing Queue</h3>
                {completedJobs.length > 0 && (
                  <button 
                    onClick={clearCompleted}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    Clear Completed
                  </button>
                )}
              </div>
            </div>

            {/* Action List */}
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {jobs.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <CircleIcon className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No actions in the queue.</p>
                </div>
              ) : (
                jobs.map((job, index) => { 
                  const isCurrentProcessing = job.id === currentJob?.id;
                  const isCompleted = job.status === 'success';
                  const hasError = job.status === 'error';
                  const itemProgress = isCompleted 
                    ? 100 // Always show 100% for completed jobs
                    : job.progress.total > 0 
                      ? Math.min(Math.round((job.progress.current / job.progress.total) * 100), 100)
                      : 0;
                  
                  // Calculate time remaining for this job
                  const itemTimeRemainingMs = job.startedAt && job.progress.total > 0
                    ? (() => {
                        const elapsed = Date.now() - job.startedAt;
                        const progressRatio = job.progress.current / job.progress.total;
                        if (progressRatio === 0) return 0;
                        const estimatedTotal = elapsed / progressRatio;
                        return Math.max(0, estimatedTotal - elapsed);
                      })()
                    : 0;

                  let ActionButtonIcon = XIcon;
                  let actionButtonTitle = "Cancel action";

                  if (isCompleted || hasError) {
                    // No button for completed/error, icon shown separately
                  } else if (isCurrentProcessing) {
                    ActionButtonIcon = StopCircleIcon;
                    actionButtonTitle = "Stop action";
                  }

                  return (
                    <DropdownMenuItem 
                      key={job.id} 
                      className={cn(
                        "flex justify-between items-center text-sm mb-1 p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70", 
                        index < jobs.length - 1 ? "border-b border-slate-50 dark:border-slate-700/50" : "",
                        isCurrentProcessing && "bg-slate-50 dark:bg-slate-700/50"
                      )}
                      onSelect={(e) => e.preventDefault()} 
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0"> 
                        <DetailedProgressCircle percentage={itemProgress} isCompleted={isCompleted} />
                        <div className="flex flex-col flex-1 min-w-0"> 
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "font-medium truncate", 
                              isCurrentProcessing ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200",
                              isCompleted && "text-green-600 dark:text-green-400 line-through",
                              hasError && "text-red-600 dark:text-red-400"
                            )}>
                              {getActionDisplayTitle(job)}
                            </span>
                            {job.type !== 'analysis' && job.targetSenders && job.targetSenders.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0">
                                    <InfoIcon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs p-2 rounded shadow-lg dark:shadow-slate-950/50 border border-slate-200 dark:border-slate-700 max-w-xs"> 
                                  <p className="font-semibold mb-1">Targeted Senders:</p>
                                  <ul className="list-disc list-inside pl-1">
                                    {job.targetSenders.map(sender => <li key={sender} className="truncate">{sender}</li>)} 
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <span className={cn("text-xs text-slate-500 dark:text-slate-400 truncate", isCompleted && "line-through")}>
                            {job.status === 'queued' ? (
                              'Waiting...'
                            ) : job.status === 'success' ? (
                              'Completed successfully'
                            ) : job.status === 'error' ? (
                              'Failed - see error details'
                            ) : job.status === 'cancelled' ? (
                              'Cancelled by user'
                            ) : job.progress.total > 0 ? (
                              <>
                                {formatEmailCount(job.progress.current)} of ~{formatEmailCount(job.progress.total)} 
                                {job.status === 'running' && itemTimeRemainingMs > 0 && ` (${formatTimeRemaining(itemTimeRemainingMs)})`}
                              </>
                            ) : (
                              'Preparing...'
                            )}
                          </span>
                        </div>
                      </div>
                      {!isCompleted && !hasError ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            cancel(job.id); 
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0",
                          )}
                          title={actionButtonTitle}
                        >
                          <ActionButtonIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : isCompleted ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                      ) : hasError ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-0.5 rounded flex-shrink-0">
                              <AlertCircleIcon className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs p-2 rounded shadow-lg dark:shadow-slate-950/50 border border-slate-200 dark:border-slate-700 max-w-xs">
                            <p className="font-semibold mb-1">Error Details:</p>
                            <p>{job.error || "An unknown error occurred."}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
} 