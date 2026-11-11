/**
 * archiveSenders.ts
 *
 * Archives every email from a set of senders that is still in the inbox.
 *
 * In Gmail, "archive" is not a place. Every message carries labels, and being
 * "in the inbox" just means having the INBOX system label. Archiving removes that
 * label and nothing else: the message stays in All Mail, keeps its read state and
 * other labels, stays searchable, and comes back to the inbox if someone replies.
 *
 * Two rules shape this module:
 *
 * 1. Scope is everything. The search is always `from:<sender> in:inbox`. A sender
 *    address that is empty or could smuggle extra search terms in is refused,
 *    because a query that lost its `from:` would archive the entire inbox.
 * 2. List first, then write. Removing INBOX shrinks the very result set we would be
 *    paging through, and Gmail page tokens do not account for that, so paging and
 *    writing at the same time can skip mail. We collect every ID up front.
 *
 * The orchestration takes its Gmail calls as injectable dependencies so it can be
 * tested without a network. The hook (useArchive) supplies auth, logging and UI.
 */

import { fetchMessageIds } from './fetchMessageIds'
import { processBatchModifyLabels } from './batchModifyLabels'

/** Largest page `users.messages.list` will return. */
export const ARCHIVE_LIST_PAGE_SIZE = 500
/** Gmail's documented ceiling for `users.messages.batchModify`. */
export const ARCHIVE_MODIFY_BATCH_SIZE = 1000
/** Safety valve: 400 pages of 500 is 200k emails from one sender. */
const MAX_PAGES_PER_SENDER = 400

// Characters that would change the meaning of a Gmail search if they appeared in
// the sender term: whitespace splits terms, quotes and brackets group them.
const UNSAFE_SEARCH_CHARS = /[\s"'(){}[\]]/

/** True if the address is safe to drop into a `from:` search term. */
export function isArchivableSenderEmail(email: string): boolean {
  if (typeof email !== 'string') return false
  const trimmed = email.trim()
  if (!trimmed || UNSAFE_SEARCH_CHARS.test(trimmed)) return false
  const at = trimmed.lastIndexOf('@')
  return at > 0 && at < trimmed.length - 1
}

/**
 * The search for one sender's mail that is still in the inbox.
 * @throws If the address could not be searched for safely.
 */
export function buildArchiveQuery(senderEmail: string): string {
  if (!isArchivableSenderEmail(senderEmail)) {
    throw new Error(`Refusing to build an archive search for sender "${senderEmail}"`)
  }
  return `-from:me from:${senderEmail.trim()} in:inbox`
}

/**
 * Archives messages by removing the INBOX label. Adds nothing.
 * @throws If any batch still fails after `batchModifyLabels` exhausts its retries,
 * so callers never count un-archived mail as archived.
 */
export async function batchArchiveMessages(accessToken: string, messageIds: string[]): Promise<void> {
  if (!messageIds?.length) return

  const failedBatches = await processBatchModifyLabels(accessToken, messageIds, {
    removeLabelIds: ['INBOX'],
  })

  if (failedBatches.length > 0) {
    const totalBatches = Math.ceil(messageIds.length / ARCHIVE_MODIFY_BATCH_SIZE)
    throw new Error(
      `Failed to archive: ${failedBatches.length} of ${totalBatches} batch(es) did not complete.`
    )
  }
}

export interface ArchiveSendersDeps {
  /** Called before every Gmail request, so a long run can refresh its token. */
  getAccessToken: () => Promise<string>
  listMessageIds?: (
    accessToken: string,
    query: string,
    pageToken?: string
  ) => Promise<{ messageIds: string[]; nextPageToken?: string }>
  /** Must throw on failure. Receives at most ARCHIVE_MODIFY_BATCH_SIZE IDs. */
  archiveMessages?: (accessToken: string, messageIds: string[]) => Promise<void>
  isCancelled?: () => boolean
  /** (archived so far, total found). Called once the total is known, then per batch. */
  onProgress?: (done: number, total: number) => void
}

export interface ArchiveSendersResult {
  endType: 'success' | 'user_stopped' | 'runtime_error'
  archivedCount: number
  /** Emails archived per sender. Senders with nothing in the inbox show 0. */
  perSender: Record<string, number>
  /** Senders whose address could not be searched safely, so were left alone. */
  skippedSenders: string[]
  error?: string
}

const defaultList: NonNullable<ArchiveSendersDeps['listMessageIds']> = (token, query, pageToken) =>
  fetchMessageIds(token, query, pageToken, ARCHIVE_LIST_PAGE_SIZE)

export async function archiveSenders(
  senderEmails: string[],
  deps: ArchiveSendersDeps
): Promise<ArchiveSendersResult> {
  const listMessageIds = deps.listMessageIds ?? defaultList
  const archiveMessages = deps.archiveMessages ?? batchArchiveMessages
  const isCancelled = deps.isCancelled ?? (() => false)

  const perSender: Record<string, number> = {}
  const skippedSenders: string[] = []
  let archivedCount = 0

  const result = (endType: ArchiveSendersResult['endType'], error?: string): ArchiveSendersResult => ({
    endType,
    archivedCount,
    perSender,
    skippedSenders,
    ...(error ? { error } : {}),
  })

  // --- Phase 1: find every inbox message, without changing anything ---
  const owner = new Map<string, string>() // message id -> sender
  const seenSenders = new Set<string>()

  try {
    for (const rawEmail of senderEmails) {
      if (!isArchivableSenderEmail(rawEmail)) {
        skippedSenders.push(rawEmail)
        continue
      }
      const email = rawEmail.trim()
      if (seenSenders.has(email)) continue
      seenSenders.add(email)
      perSender[email] = 0

      const query = buildArchiveQuery(email)
      let pageToken: string | undefined
      let pages = 0
      do {
        if (isCancelled()) return result('user_stopped')
        const token = await deps.getAccessToken()
        const page = await listMessageIds(token, query, pageToken)
        for (const id of page.messageIds) {
          if (!owner.has(id)) owner.set(id, email)
        }
        pageToken = page.nextPageToken
        pages++
      } while (pageToken && pages < MAX_PAGES_PER_SENDER)
    }
  } catch (error: any) {
    return result('runtime_error', `Couldn't search your inbox: ${error?.message || 'Unknown error'}`)
  }

  // --- Phase 2: remove INBOX in API-sized batches ---
  const allIds = Array.from(owner.keys())
  const total = allIds.length
  deps.onProgress?.(0, total)

  for (let i = 0; i < allIds.length; i += ARCHIVE_MODIFY_BATCH_SIZE) {
    if (isCancelled()) return result('user_stopped')
    const batch = allIds.slice(i, i + ARCHIVE_MODIFY_BATCH_SIZE)
    try {
      const token = await deps.getAccessToken()
      await archiveMessages(token, batch)
    } catch (error: any) {
      return result('runtime_error', `Archiving stopped partway: ${error?.message || 'Unknown error'}`)
    }
    for (const id of batch) {
      const email = owner.get(id)!
      perSender[email] += 1
    }
    archivedCount += batch.length
    deps.onProgress?.(archivedCount, total)
  }

  return result('success')
}
