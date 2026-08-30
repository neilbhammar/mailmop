/**
 * deleteMethod.ts
 *
 * One vocabulary for "where does this mail actually go" — permanently deleted
 * via `messages.batchDelete`, or moved to Gmail's trash via `messages.batchModify`.
 *
 * DeleteConfirmModal has offered this choice for a while; it just lived inline
 * in that one component, so the delete-with-exceptions flow had no way to reach
 * it. Everything shared between the two dialogs now lives here.
 */

export type DeleteMethod = 'trash' | 'permanent'

/** localStorage key. Shared with DeleteConfirmModal so one choice covers both dialogs. */
export const DELETE_METHOD_PREF_KEY = 'deleteMethodPreference'

/**
 * What a user with no stored preference sees pre-selected.
 *
 * Permanent, because trashed mail keeps occupying the Gmail quota until it is
 * purged, and reclaiming storage is the reason most people open MailMop.
 */
export function defaultDeleteMethod(): DeleteMethod {
  return 'permanent'
}

/**
 * Interprets a stored preference. Anything unrecognised means "this user has
 * not chosen", so it falls back to the default rather than to the safety net.
 */
export function readDeleteMethodPreference(stored: unknown): DeleteMethod {
  if (stored === 'trash') return 'trash'
  if (stored === 'permanent') return 'permanent'
  return defaultDeleteMethod()
}

/**
 * Resolves the method an executor is about to act on.
 *
 * This is NOT the same question as `readDeleteMethodPreference`. By the time we
 * get here a real user has made a real choice, and the only way the value is
 * unrecognised is that the plumbing lost or mangled it. Both wrong answers cost
 * something, but one of them is `batchDelete` on mail nobody agreed to destroy,
 * so anything that is not exactly 'permanent' resolves to trash.
 */
export function resolveDeleteMethod(value: unknown): DeleteMethod {
  return value === 'permanent' ? 'permanent' : 'trash'
}

/** Whether the user can get the mail back afterwards. */
export function isReversible(method: DeleteMethod): boolean {
  return method === 'trash'
}

export interface DeleteMethodCopy {
  /** Verb for titles and headings. */
  verb: string
  /** Verb for the in-flight button label. */
  progressVerb: string
  /** The method's own name: the Select option label and the confirm button label. */
  methodLabel: string
  /** Heading above the filter builder. */
  criteriaHeading: string
  /** The consequence sentence shown in the callout under the method picker. */
  callout: string
  /** Glyph in the callout's badge: info for the recoverable path, warning for the other. */
  calloutBadge: string
  /** Accent colour for the callout and confirm button. */
  tone: 'red' | 'orange'
}

const COPY: Record<DeleteMethod, DeleteMethodCopy> = {
  permanent: {
    verb: 'Delete',
    progressVerb: 'Deleting',
    methodLabel: 'Permanently Delete',
    criteriaHeading: 'Delete emails that match these criteria:',
    callout: 'This action cannot be undone. Emails will be permanently deleted.',
    calloutBadge: '\u26a0',
    tone: 'red',
  },
  trash: {
    verb: 'Trash',
    progressVerb: 'Moving to Trash',
    methodLabel: 'Move to Trash',
    criteriaHeading: 'Trash emails that match these criteria:',
    callout:
      'Trash label will be applied - emails will auto-delete in 30 days. ' +
      'Gmail storage will not free up until deletion.',
    calloutBadge: '\u2139',
    tone: 'orange',
  },
}

export function deleteMethodCopy(method: DeleteMethod): DeleteMethodCopy {
  return COPY[method]
}

/** Headline for the pre-flight warning, e.g. "About to move all 412 emails to trash". */
export function confirmWarningHeadline(method: DeleteMethod, summary: string): string {
  return method === 'trash' ? `About to move ${summary} to trash` : `About to delete ${summary}`
}

/** Title shown for a queued job in ProcessQueue. */
export function queueJobTitle(method: DeleteMethod, senderText: string): string {
  return method === 'trash'
    ? `Trash with exceptions for ${senderText}`
    : `Delete with exceptions for ${senderText}`
}

export interface CompletionToastInput {
  emailsProcessed: number
  senderCount: number
}

/** Toast shown when a filtered run finishes successfully. */
export function completionToast(
  method: DeleteMethod,
  { emailsProcessed, senderCount }: CompletionToastInput
): { title: string; description: string } {
  const senders = `${senderCount} sender(s)`

  if (emailsProcessed === 0) {
    return {
      title: 'Nothing Matched',
      description: `No emails found that match your criteria. All emails from ${senders} remain in your inbox.`,
    }
  }

  const count = emailsProcessed.toLocaleString()

  if (method === 'trash') {
    return {
      title: 'Moved to Trash',
      description: `Moved ${count} matching emails from ${senders} to trash. Recoverable for 30 days.`,
    }
  }

  return {
    title: 'Filtered Deletion Complete',
    description: `Successfully deleted ${count} matching emails from ${senders}.`,
  }
}
