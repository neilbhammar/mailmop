import { logger } from '@/lib/utils/logger';

export async function batchDeleteMessages(
  accessToken: string,
  messageIds: string[]
): Promise<void> {
  if (!messageIds || messageIds.length === 0) {
    logger.warn('No message IDs provided for deletion', { component: 'batchDeleteMessages' });
    return;
  }

  const ids = messageIds.length > 1000 ? messageIds.slice(0, 1000) : messageIds;

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/batchDelete',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || response.statusText;
    throw new Error(`Batch deletion failed: ${message}`);
  }
}
