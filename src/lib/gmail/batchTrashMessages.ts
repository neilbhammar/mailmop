/**
 * batchTrashMessages.ts
 *
 * Moves a batch of Gmail messages to the trash, where they stay recoverable
 * until Gmail purges them after 30 days.
 *
 * This is the reversible counterpart to `batchDeleteMessages`, and it is written
 * to be a drop-in for it: same argument shape, resolves on success, THROWS on
 * failure. That last part matters. Callers such as the delete-with-exceptions
 * loop bank a batch as processed as soon as the awaited call returns, then
 * decrement the sender's cached email count by that many. `processBatchModifyLabels`
 * reports failures by returning batch indices instead of throwing, so handing
 * its result straight back would report un-trashed mail as trashed.
 */

import { processBatchModifyLabels } from './batchModifyLabels'
import { logger } from '@/lib/utils/logger'

/** Gmail's documented ceiling for `users.messages.batchModify`. */
const BATCH_MODIFY_LIMIT = 1000

/**
 * Moves messages to the trash by adding Gmail's TRASH system label.
 *
 * Only adds TRASH — nothing is removed. That mirrors Gmail's own trash action
 * and the label MailMop already applies from the plain delete and block-sender
 * flows, and it keeps read state and user labels intact so an untrash puts the
 * message back where the user left it.
 *
 * @param accessToken - A valid Google OAuth 2.0 access token.
 * @param messageIds - Message IDs to trash. Split automatically past the API limit.
 * @throws If any batch fails after `batchModifyLabels` exhausts its retries.
 */
export async function batchTrashMessages(
  accessToken: string,
  messageIds: string[]
): Promise<void> {
  if (!messageIds || messageIds.length === 0) {
    logger.warn('No message IDs provided for trashing', { component: 'batchTrashMessages' })
    return
  }

  logger.debug('Attempting to trash messages', {
    component: 'batchTrashMessages',
    messageCount: messageIds.length,
  })

  // processBatchModifyLabels chunks at the same limit, but be explicit about it
  // so the count below is reported against a number we control.
  const totalBatches = Math.ceil(messageIds.length / BATCH_MODIFY_LIMIT)

  const failedBatches = await processBatchModifyLabels(accessToken, messageIds, {
    addLabelIds: ['TRASH'],
  })

  if (failedBatches.length > 0) {
    logger.error('Some batches failed to trash', {
      component: 'batchTrashMessages',
      failedBatches,
      totalBatches,
    })
    throw new Error(
      `Failed to move messages to trash: ${failedBatches.length} of ${totalBatches} ` +
        `batch(es) did not complete. No emails from those batches were moved.`
    )
  }

  logger.debug('Successfully trashed messages', {
    component: 'batchTrashMessages',
    messageCount: messageIds.length,
  })
}
