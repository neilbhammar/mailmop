import * as SQLite from 'expo-sqlite';
import { SenderResult } from '@/types/gmail';
import { ActionType } from '@/types/actions';
import { dispatchAppEvent } from '@/lib/events';
import { ANALYSIS_CHANGE_EVENT } from '@shared/constants/events';

const DB_NAME = 'mailmop.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS senders (
          senderEmail TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          analysisId TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_senders_analysis ON senders(analysisId);
      `);
      return db;
    });
  }
  return dbPromise;
}

function notifyAnalysisChange() {
  dispatchAppEvent(ANALYSIS_CHANGE_EVENT, { type: 'senders' });
}

export { ANALYSIS_CHANGE_EVENT };

export async function hasSenderAnalysis(): Promise<boolean> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM senders');
  return (row?.count ?? 0) > 0;
}

export async function clearSenderAnalysis(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM senders');
  notifyAnalysisChange();
}

export async function storeSenderResults(senders: SenderResult[]): Promise<void> {
  const db = await getDB();
  await db.withTransactionAsync(async () => {
    for (const sender of senders) {
      await db.runAsync(
        'INSERT OR REPLACE INTO senders (senderEmail, data, analysisId) VALUES (?, ?, ?)',
        [sender.senderEmail, JSON.stringify(sender), sender.analysisId]
      );
    }
  });
  notifyAnalysisChange();
}

export async function getAllSenders(): Promise<SenderResult[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM senders');
  return rows.map((row) => JSON.parse(row.data) as SenderResult);
}

export async function getSenderByEmail(email: string): Promise<SenderResult | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ data: string }>(
    'SELECT data FROM senders WHERE senderEmail = ?',
    [email]
  );
  return row ? (JSON.parse(row.data) as SenderResult) : null;
}

export async function updateSender(sender: SenderResult): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO senders (senderEmail, data, analysisId) VALUES (?, ?, ?)',
    [sender.senderEmail, JSON.stringify(sender), sender.analysisId]
  );
  notifyAnalysisChange();
}

export async function markSenderActionTaken(
  senderEmail: string,
  action: ActionType
): Promise<void> {
  const sender = await getSenderByEmail(senderEmail);
  if (!sender) return;
  const actionsTaken = sender.actionsTaken ?? [];
  if (!actionsTaken.includes(action)) {
    sender.actionsTaken = [...actionsTaken, action];
    await updateSender(sender);
  }
}

export async function updateSenderUnreadCount(
  senderEmail: string,
  unreadCount: number
): Promise<void> {
  const sender = await getSenderByEmail(senderEmail);
  if (!sender) return;
  sender.unread_count = unreadCount;
  await updateSender(sender);
}

export async function updateSenderAfterDeletion(
  senderEmail: string,
  deletedCount: number
): Promise<void> {
  const sender = await getSenderByEmail(senderEmail);
  if (!sender) return;
  sender.count = Math.max(0, sender.count - deletedCount);
  if (sender.count === 0) {
    const db = await getDB();
    await db.runAsync('DELETE FROM senders WHERE senderEmail = ?', [senderEmail]);
  } else {
    await updateSender(sender);
  }
  notifyAnalysisChange();
}

export async function updateSenderEnrichment(
  senderEmail: string,
  enrichment: SenderResult['unsubscribe']
): Promise<void> {
  const sender = await getSenderByEmail(senderEmail);
  if (!sender) return;
  sender.unsubscribe = { ...sender.unsubscribe, ...enrichment };
  if (enrichment?.enrichedUrl) {
    sender.hasUnsubscribe = true;
  }
  await updateSender(sender);
}
