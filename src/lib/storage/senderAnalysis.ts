import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SenderResult } from '@/types/gmail';
import { ActionType } from '@/types/actions';

// Database name and version
const DB_NAME = 'mailmop';
const DB_VERSION = 2;

// Custom event for state changes
export const ANALYSIS_CHANGE_EVENT = 'mailmop:analysis-change';

// Define our database schema
interface MailMopDB extends DBSchema {
  senders: {
    key: string; // senderEmail
    value: SenderResult;
    indexes: {
      'by-analysis': string; // analysisId
    };
  };
}

// Helper to notify components of changes
function notifyAnalysisChange() {
  if (typeof window === 'undefined') return;
  
  window.dispatchEvent(
    new CustomEvent(ANALYSIS_CHANGE_EVENT, {
      detail: { type: 'senders' }
    })
  );
}

// Initialize/get database connection
export async function getDB(): Promise<IDBPDatabase<MailMopDB>> {
  return openDB<MailMopDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create the senders object store if it doesn't exist
      if (!db.objectStoreNames.contains('senders')) {
        const store = db.createObjectStore('senders', {
          keyPath: 'senderEmail'
        });
        // Create an index to quickly find senders by analysisId
        store.createIndex('by-analysis', 'analysisId');
      }
    }
  });
}

/**
 * Checks if we have any sender analysis data stored
 */
export async function hasSenderAnalysis(): Promise<boolean> {
  const db = await getDB();
  const count = await db.count('senders');
  return count > 0;
}

/**
 * Clears all sender analysis data
 */
export async function clearSenderAnalysis(): Promise<void> {
  const db = await getDB();
  await db.clear('senders');
  notifyAnalysisChange();
}

/**
 * Stores a batch of sender results
 */
export async function storeSenderResults(senders: SenderResult[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('senders', 'readwrite');
  
  // Store each sender
  await Promise.all(
    senders.map(sender => tx.store.put(sender))
  );
  
  await tx.done;
  notifyAnalysisChange();
}

/**
 * Gets all senders for a specific analysis
 */
export async function getSendersByAnalysis(analysisId: string): Promise<SenderResult[]> {
  const db = await getDB();
  return db.getAllFromIndex('senders', 'by-analysis', analysisId);
}

/**
 * Gets all stored senders
 */
export async function getAllSenders(): Promise<SenderResult[]> {
  const db = await getDB();
  return db.getAll('senders');
}

/**
 * Updates a single sender's data
 */
export async function updateSender(sender: SenderResult): Promise<void> {
  const db = await getDB();
  await db.put('senders', sender);
  notifyAnalysisChange();
}

/**
 * Gets a single sender by email
 */
export async function getSenderByEmail(email: string): Promise<SenderResult | undefined> {
  const db = await getDB();
  return db.get('senders', email);
}

/**
 * Marks an action as taken for a specific sender in IndexedDB.
 * Adds the action type to the sender's actionsTaken array if not already present.
 * 
 * @param senderEmail The email address of the sender.
 * @param action The type of action taken (e.g., 'delete', 'unsubscribe').
 */
export async function markSenderActionTaken(
  senderEmail: string,
  action: ActionType
): Promise<void> {
  const db = await getDB();
  const sender = await db.get('senders', senderEmail);

  if (!sender) {
    console.warn(`[markSenderActionTaken] Sender not found: ${senderEmail}`);
    return;
  }

  // Initialize actionsTaken if it doesn't exist
  const currentActions = sender.actionsTaken || [];

  // Add the action only if it's not already present
  if (!currentActions.includes(action)) {
    const updatedSender: SenderResult = {
      ...sender,
      actionsTaken: [...currentActions, action],
    };

    // Update the sender in the database
    await db.put('senders', updatedSender);
    console.log(`[markSenderActionTaken] Marked '${action}' for sender: ${senderEmail}`);
    // Notify components that sender data has changed
    notifyAnalysisChange(); 
  } else {
    console.log(`[markSenderActionTaken] Action '${action}' already marked for sender: ${senderEmail}`);
  }
}

/**
 * Updates the unread count for a specific sender to 0.
 * Used after marking emails as read to reflect the change in the UI.
 * 
 * @param senderEmail The email address of the sender.
 */
export async function updateSenderUnreadCount(
  senderEmail: string,
  newUnreadCount: number = 0
): Promise<void> {
  const db = await getDB();
  const sender = await db.get('senders', senderEmail);

  if (!sender) {
    console.warn(`[updateSenderUnreadCount] Sender not found: ${senderEmail}`);
    return;
  }

  // Update the sender's unread count
  const updatedSender: SenderResult = {
    ...sender,
    unread_count: newUnreadCount,
  };

  // Update the sender in the database
  await db.put('senders', updatedSender);
  console.log(`[updateSenderUnreadCount] Updated unread count to ${newUnreadCount} for sender: ${senderEmail}`);
  
  // Notify components that sender data has changed
  notifyAnalysisChange(); 
}

/**
 * Updates the unread count for multiple senders to 0.
 * Used for batch operations like marking multiple senders as read.
 * 
 * @param senderEmails Array of sender email addresses to update.
 */
export async function updateMultipleSendersUnreadCount(
  senderEmails: string[],
  newUnreadCount: number = 0
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('senders', 'readwrite');
  
  // Update each sender's unread count
  await Promise.all(
    senderEmails.map(async (senderEmail) => {
      const sender = await tx.store.get(senderEmail);
      
      if (sender) {
        const updatedSender: SenderResult = {
          ...sender,
          unread_count: newUnreadCount,
        };
        await tx.store.put(updatedSender);
        console.log(`[updateMultipleSendersUnreadCount] Updated unread count to ${newUnreadCount} for sender: ${senderEmail}`);
      } else {
        console.warn(`[updateMultipleSendersUnreadCount] Sender not found: ${senderEmail}`);
      }
    })
  );
  
  await tx.done;
  
  // Notify components that sender data has changed
  notifyAnalysisChange(); 
}

/**
 * Updates both the count and unread count for a specific sender to 0.
 * Used after deleting all emails from a sender to reflect the change in the UI.
 * 
 * @param senderEmail The email address of the sender.
 */
export async function updateSenderAfterDeletion(
  senderEmail: string
): Promise<void> {
  const db = await getDB();
  const sender = await db.get('senders', senderEmail);

  if (!sender) {
    console.warn(`[updateSenderAfterDeletion] Sender not found: ${senderEmail}`);
    return;
  }

  // Update the sender's count and unread count to 0
  const updatedSender: SenderResult = {
    ...sender,
    count: 0,
    unread_count: 0,
  };

  // Update the sender in the database
  await db.put('senders', updatedSender);
  console.log(`[updateSenderAfterDeletion] Updated count and unread_count to 0 for sender: ${senderEmail}`);
  
  // Notify components that sender data has changed
  notifyAnalysisChange(); 
}

/**
 * Updates both count and unread count for multiple senders to 0.
 * Used for batch delete operations.
 * 
 * @param senderEmails Array of sender email addresses to update.
 */
export async function updateMultipleSendersAfterDeletion(
  senderEmails: string[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('senders', 'readwrite');
  
  // Update each sender's count and unread count
  await Promise.all(
    senderEmails.map(async (senderEmail) => {
      const sender = await tx.store.get(senderEmail);
      
      if (sender) {
        const updatedSender: SenderResult = {
          ...sender,
          count: 0,
          unread_count: 0,
        };
        await tx.store.put(updatedSender);
        console.log(`[updateMultipleSendersAfterDeletion] Updated count and unread_count to 0 for sender: ${senderEmail}`);
      } else {
        console.warn(`[updateMultipleSendersAfterDeletion] Sender not found: ${senderEmail}`);
      }
    })
  );
  
  await tx.done;
  
  // Notify components that sender data has changed
  notifyAnalysisChange(); 
} 