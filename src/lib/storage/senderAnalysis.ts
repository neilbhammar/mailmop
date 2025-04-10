import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SenderResult } from '@/types/gmail';

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