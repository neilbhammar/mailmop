import React, { useState, useRef, useEffect } from 'react';
import { 
  CircleIcon, 
  XIcon, 
  ChevronDownIcon, 
  AlertCircleIcon, 
  StopCircleIcon, // Added for Stop button
  CheckCircleIcon, // Added for Completed status
  InfoIcon // Added for Details tooltip trigger
} from 'lucide-react';
import { LocalActionLog, ActionType, ActionStatus } from '@/types/actions';
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

// Extend LocalActionLog for this component's purpose if needed, or assume targetSenders is optional
interface ActionLogWithSenders extends LocalActionLog {
  targetSenders?: string[];
}

// Helper function to generate a test action
const createTestAction = (type: ActionType = 'analysis', processed?: number, total?: number, runtime?: number): ActionLogWithSenders => {
  const totalEmails = total || Math.floor(Math.random() * 20000) + 5000;
  const processedEmailCount = processed || Math.floor(Math.random() * totalEmails);
  
  // Make some actions completed for testing
  const statuses: ActionStatus[] = ['analyzing', 'deleting', 'marking', 'completed'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  let targetSenders: string[] | undefined = undefined;
  if (type !== 'analysis') {
    const numSenders = Math.floor(Math.random() * 24) + 1; // 1 to 3 senders
    targetSenders = Array.from({ length: numSenders }, (_, i) => `sender${i+1}@example.com`);
  }

  return {
    client_action_id: `test-${Date.now()}-${Math.random()}`,
    analysis_id: null,
    type: type,
    status: randomStatus,
    created_at: new Date().toISOString(),
    start_time: new Date().toISOString(),
    last_update_time: new Date().toISOString(),
    estimated_runtime_ms: runtime || (totalEmails - processedEmailCount) * 100, 
    total_estimated_emails: totalEmails,
    processed_email_count: randomStatus === 'completed' ? totalEmails : processedEmailCount,
    completed_at: randomStatus === 'completed' ? new Date().toISOString() : null,
    end_type: randomStatus === 'completed' ? 'success' : null,
    completion_reason: randomStatus === 'completed' ? 'Successfully completed' : null,
    current_batch_index: Math.floor(processedEmailCount / 1000), 
    total_estimated_batches: Math.ceil(totalEmails / 1000), 
    targetSenders: targetSenders,
  };
};

// Helper for readable time format
const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return "~0 minutes";
  if (ms < 60000) return "<1 minute";
  const minutes = Math.ceil(ms / 60000);
  return `~${minutes} minutes`;
};

// Larger Progress circle component based on reference
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

// Function to format email count (simplified from reference)
const formatEmailCount = (count: number) => {
  return count.toLocaleString();
};

const getActionDisplayTitle = (action: ActionLogWithSenders): string => {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const baseTypeName = action.type.replace(/_/g, ' '); // e.g., "mark as read", "delete with exceptions"
  const senderCount = action.targetSenders?.length || 0;
  const senderText = senderCount > 0 ? `${senderCount} Sender${senderCount > 1 ? 's' : ''}` : '';

  if (senderCount > 0 && action.type !== 'analysis' && action.type !== 'create_filter') {
    switch (action.type) {
      case 'delete':
        return `Delete ${senderText}`;
      case 'delete_with_exceptions':
        return `Delete with exceptions for ${senderText}`;
      case 'mark_as_read':
        return `Mark ${senderText} as Read`;
      case 'unsubscribe':
        return `Unsubscribe from ${senderText}`;
      // Removed 'block' case as it's not in ActionType
      // Add other specific phrasings here if needed
      default:
        // Generic fallback for other types with senders
        return `${capitalize(baseTypeName)} for ${senderText}`;
    }
  }
  // Default title for analysis, create_filter, or actions without specified sender count in title
  return capitalize(baseTypeName);
};

export default function ProcessQueue() {
  const [activeActions, setActiveActions] = useState<ActionLogWithSenders[]>([]);
  const [open, setOpen] = useState(false); 

  const addTestAction = () => {
    const types: ActionType[] = ['analysis', 'delete', 'mark_as_read', 'create_filter', 'delete_with_exceptions', 'unsubscribe'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setActiveActions(prev => [createTestAction(randomType), ...prev.slice(0,4)]);
  };
  
  const removeAction = (id: string) => {
    setActiveActions(prev => prev.filter(action => action.client_action_id !== id));
    if (activeActions.filter(action => action.client_action_id !== id).length === 0) setOpen(false); 
  };

  const currentAction = activeActions.find(a => a.status !== 'completed'); // First non-completed is current
  const displayedActions = activeActions;
  const pendingCount = displayedActions.filter(a => a.status !== 'completed' && a.client_action_id !== currentAction?.client_action_id).length;

  const progressPercentage = currentAction
    ? Math.min(
        Math.round((currentAction.processed_email_count / currentAction.total_estimated_emails) * 100),
        100 
      )
    : 0;
  
  const timeRemainingMs = currentAction 
    ? currentAction.estimated_runtime_ms * (1 - (currentAction.processed_email_count / currentAction.total_estimated_emails))
    : 0;

  // "Keep tab open" badge is always shown if there is a current (active, non-completed) action.
  const showKeepTabOpenBadge = !!currentAction;

  const triggerContent = currentAction ? (
    // ACTIVE STATE DISPLAY IN TRIGGER
    <div className="flex items-center justify-between w-full h-full px-3 py-2">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <DetailedProgressCircle percentage={progressPercentage} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {getActionDisplayTitle(currentAction)}
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
              {formatEmailCount(currentAction.processed_email_count)} of ~{formatEmailCount(currentAction.total_estimated_emails)}
            </div>
            <div className="text-slate-400 dark:text-slate-500 flex-shrink-0">•</div>
            <div className="flex-shrink-0">
              {formatTimeRemaining(timeRemainingMs)}
            </div>
            {pendingCount > 0 && (
              <>
                <div className="text-slate-400 dark:text-slate-500 flex-shrink-0">•</div>
                <div className="flex-shrink-0">{pendingCount} Queued</div>
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
    // INACTIVE STATE DISPLAY IN TRIGGER (no active non-completed tasks)
    <div className="flex items-center justify-center w-full h-full px-4">
      <CircleIcon className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500 mr-2" /> 
      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Process Queue</span>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 justify-end">
        <button 
          onClick={addTestAction}
          className="mr-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex-shrink-0"
        >
          Add Test Action
        </button>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <div
              className={cn(
                "flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-300 ease-in-out cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 overflow-hidden",
                currentAction ? "w-[400px] h-[60px]" : "w-[150px] h-[40px]"
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
                {displayedActions.some(a => a.status === 'completed') && (
                  <button 
                    onClick={() => setActiveActions(prev => prev.filter(a => a.status !== 'completed'))}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    Clear Completed
                  </button>
                )}
              </div>
            </div>

            {/* Action List */}
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {displayedActions.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <CircleIcon className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No actions in the queue.</p>
                </div>
              ) : (
                displayedActions.map((actionItem, index) => { 
                  const isCurrentProcessing = currentAction?.client_action_id === actionItem.client_action_id && actionItem.status !== 'completed';
                  const isCompleted = actionItem.status === 'completed';
                  const itemProgress = isCompleted ? 100 : Math.min(Math.round((actionItem.processed_email_count / actionItem.total_estimated_emails) * 100), 100);
                  const itemTimeRemainingMs = actionItem.estimated_runtime_ms * (1 - (actionItem.processed_email_count / actionItem.total_estimated_emails));

                  let ActionButtonIcon = XIcon;
                  let actionButtonTitle = "Cancel action";

                  if (isCompleted) {
                    // No button for completed, icon shown separately
                  } else if (isCurrentProcessing) {
                    ActionButtonIcon = StopCircleIcon;
                    actionButtonTitle = "Stop action";
                  }

                  return (
                    <DropdownMenuItem 
                      key={actionItem.client_action_id} 
                      className={cn(
                        "flex justify-between items-center text-sm mb-1 p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70", 
                        index < displayedActions.length -1 ? "border-b border-slate-50 dark:border-slate-700/50" : "",
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
                              isCompleted && "text-green-600 dark:text-green-400 line-through"
                            )}>
                              {getActionDisplayTitle(actionItem)}
                            </span>
                            {actionItem.end_type === 'runtime_error' && ( 
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="p-0.5 rounded flex-shrink-0">
                                    <AlertCircleIcon className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs p-2 rounded shadow-lg dark:shadow-slate-950/50 border border-slate-200 dark:border-slate-700 max-w-xs">
                                  <p className="font-semibold mb-1">Error Details:</p>
                                  <p>{actionItem.completion_reason || "An unknown error occurred."}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {actionItem.type !== 'analysis' && actionItem.targetSenders && actionItem.targetSenders.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0">
                                    <InfoIcon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs p-2 rounded shadow-lg dark:shadow-slate-950/50 border border-slate-200 dark:border-slate-700 max-w-xs"> 
                                  <p className="font-semibold mb-1">Targeted Senders:</p>
                                  <ul className="list-disc list-inside pl-1">
                                    {actionItem.targetSenders.map(sender => <li key={sender} className="truncate">{sender}</li>)} 
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <span className={cn("text-xs text-slate-500 dark:text-slate-400 truncate", isCompleted && "line-through")}>
                            {formatEmailCount(actionItem.processed_email_count)} of ~{formatEmailCount(actionItem.total_estimated_emails)} 
                            {!isCompleted && `(${formatTimeRemaining(itemTimeRemainingMs)})`}
                          </span>
                        </div>
                      </div>
                      {!isCompleted ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            removeAction(actionItem.client_action_id); 
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0",
                          )}
                          title={actionButtonTitle}
                        >
                          <ActionButtonIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                         <CheckCircleIcon className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                      )}
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