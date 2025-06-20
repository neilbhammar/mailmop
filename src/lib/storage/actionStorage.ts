// Key for storing actions in localStorage
const ACTIONS_KEY = 'mailmop:actions';

// Custom event for action changes
export const ACTION_CHANGE_EVENT = 'mailmop:action-change';

export interface SenderAction {
  senderEmail: string;
  timestamp: number;
  type: 'delete' | 'delete_with_exceptions' | 'unsubscribe' | 'mark_as_read' | 'apply_label' | 'modify_label' | 'create_filter' | 'block';
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  // Additional metadata for label actions
  labelIds?: string[];
  actionType?: 'add' | 'remove';
}

// Helper to notify components of changes
function notifyActionChange() {
  if (typeof window === 'undefined') return;
  
  window.dispatchEvent(
    new CustomEvent(ACTION_CHANGE_EVENT, {
      detail: { type: 'actions' }
    })
  );
}

/**
 * Gets all actions for a sender
 */
export function getSenderActions(senderEmail: string): SenderAction[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(ACTIONS_KEY);
  if (!stored) return [];
  
  try {
    const actions = JSON.parse(stored) as Record<string, SenderAction[]>;
    return actions[senderEmail] || [];
  } catch {
    return [];
  }
}

/**
 * Stores a new action for a sender
 */
export function storeSenderAction(action: SenderAction): void {
  if (typeof window === 'undefined') return;
  
  const stored = localStorage.getItem(ACTIONS_KEY);
  let actions: Record<string, SenderAction[]> = {};
  
  if (stored) {
    try {
      actions = JSON.parse(stored);
    } catch {
      // If parse fails, start fresh
    }
  }
  
  // Get or initialize sender's actions
  const senderActions = actions[action.senderEmail] || [];
  
  // Add new action
  senderActions.push(action);
  
  // Update storage
  actions[action.senderEmail] = senderActions;
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
  
  notifyActionChange();
}

/**
 * Updates an action's status
 */
export function updateActionStatus(
  senderEmail: string, 
  timestamp: number, 
  status: SenderAction['status'], 
  error?: string
): void {
  if (typeof window === 'undefined') return;
  
  const stored = localStorage.getItem(ACTIONS_KEY);
  if (!stored) return;
  
  try {
    const actions = JSON.parse(stored) as Record<string, SenderAction[]>;
    const senderActions = actions[senderEmail];
    
    if (!senderActions) return;
    
    // Find and update the action
    const actionIndex = senderActions.findIndex(a => a.timestamp === timestamp);
    if (actionIndex === -1) return;
    
    // Preserve all existing metadata while updating status
    senderActions[actionIndex] = {
      ...senderActions[actionIndex],
      status,
      ...(error && { error })
    };
    
    // Debug logging for modify_label actions
    if (senderActions[actionIndex].type === 'modify_label' && 
        (senderEmail.includes('groupme') || senderEmail.includes('support@groupme'))) {
      console.log(`[DEBUG] updateActionStatus('${senderEmail}', ${timestamp}, '${status}'):`, {
        updatedAction: senderActions[actionIndex],
        hasLabelIds: !!senderActions[actionIndex].labelIds,
        hasActionType: !!senderActions[actionIndex].actionType,
        labelIds: senderActions[actionIndex].labelIds,
        actionType: senderActions[actionIndex].actionType
      });
    }
    
    // Update storage
    actions[senderEmail] = senderActions;
    localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
    
    notifyActionChange();
  } catch {
    // If parse fails, do nothing
  }
}

/**
 * Gets all pending actions
 */
export function getPendingActions(): SenderAction[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(ACTIONS_KEY);
  if (!stored) return [];
  
  try {
    const actions = JSON.parse(stored) as Record<string, SenderAction[]>;
    return Object.values(actions)
      .flat()
      .filter(action => action.status === 'pending');
  } catch {
    return [];
  }
}

// Helper to store a new pending action (returns timestamp)
export function queueSenderAction(senderEmail: string, type: SenderAction['type']): number {
  const timestamp = Date.now();
  storeSenderAction({ senderEmail, type, timestamp, status: 'pending' });
  return timestamp;
}

// Helper to mark any pending actions of a given type as completed/failed
export function completePendingActions(
  senderEmail: string,
  type: SenderAction['type'],
  success: boolean,
  error?: string
): void {
  const actions = getSenderActions(senderEmail);
  actions
    .filter(a => a.type === type && a.status === 'pending')
    .forEach(pending => {
      updateActionStatus(senderEmail, pending.timestamp, success ? 'completed' : 'failed', error);
    });
}

/**
 * Checks if a sender has been moved to trash (has a completed modify_label action with TRASH label)
 */
export function isSenderTrashed(senderEmail: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const actions = getSenderActions(senderEmail);
  
  // Debug logging
  if (senderEmail.includes('groupme') || senderEmail.includes('support@groupme')) {
    console.log(`[DEBUG] isSenderTrashed('${senderEmail}'):`, {
      totalActions: actions.length,
      actions: actions,
      modifyLabelActions: actions.filter(a => a.type === 'modify_label'),
      trashActions: actions.filter(a => 
        a.type === 'modify_label' &&
        a.status === 'completed' &&
        a.actionType === 'add' &&
        a.labelIds?.includes('TRASH')
      )
    });
  }
  
  const result = actions.some(action => 
    action.type === 'modify_label' &&
    action.status === 'completed' &&
    action.actionType === 'add' &&
    action.labelIds?.includes('TRASH')
  );
  
  // Debug logging
  if (senderEmail.includes('groupme') || senderEmail.includes('support@groupme')) {
    console.log(`[DEBUG] isSenderTrashed('${senderEmail}') result:`, result);
  }
  
  return result;
}

/**
 * Helper to store a modify_label action with label metadata
 */
export function queueLabelAction(
  senderEmail: string, 
  labelIds: string[], 
  actionType: 'add' | 'remove'
): number {
  const timestamp = Date.now();
  storeSenderAction({ 
    senderEmail, 
    type: 'modify_label', 
    timestamp, 
    status: 'pending',
    labelIds,
    actionType
  });
  return timestamp;
} 