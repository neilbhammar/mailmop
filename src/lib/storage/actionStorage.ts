// Key for storing actions in localStorage
const ACTIONS_KEY = 'mailmop:actions';

// Custom event for action changes
export const ACTION_CHANGE_EVENT = 'mailmop:action-change';

export interface SenderAction {
  senderEmail: string;
  timestamp: number;
  type: 'delete' | 'unsubscribe' | 'block' | 'markUnread';
  status: 'pending' | 'completed' | 'failed';
  error?: string;
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
    
    senderActions[actionIndex] = {
      ...senderActions[actionIndex],
      status,
      ...(error && { error })
    };
    
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