import { describe, it, expect } from 'vitest'
import {
  DELETE_METHOD_PREF_KEY,
  defaultDeleteMethod,
  readDeleteMethodPreference,
  resolveDeleteMethod,
  isReversible,
  deleteMethodCopy,
  confirmWarningHeadline,
  completionToast,
  queueJobTitle,
  type DeleteMethod,
} from './deleteMethod'

/**
 * `resolveDeleteMethod` is the last thing standing between a user's choice and
 * `messages.batchDelete`, which is irreversible. The tests below care far more
 * about what it REFUSES to call 'permanent' than about what it allows: any
 * value the plumbing mangles must land on the recoverable side.
 */
describe('resolveDeleteMethod', () => {
  it('passes through the two real values', () => {
    expect(resolveDeleteMethod('permanent')).toBe('permanent')
    expect(resolveDeleteMethod('trash')).toBe('trash')
  })

  it('falls back to trash when the value is missing', () => {
    // The regression this exists to prevent: a payload that loses `deleteMethod`
    // somewhere between the modal and the executor quietly nuking the mailbox.
    expect(resolveDeleteMethod(undefined)).toBe('trash')
    expect(resolveDeleteMethod(null)).toBe('trash')
    expect(resolveDeleteMethod('')).toBe('trash')
  })

  it('falls back to trash for anything that is not exactly "permanent"', () => {
    const junk: unknown[] = [
      'Permanent',
      'PERMANENT',
      ' permanent',
      'permanent ',
      'perma',
      'delete',
      'hard',
      0,
      1,
      true,
      false,
      {},
      [],
      ['permanent'],
      { method: 'permanent' },
      NaN,
      Symbol('permanent'),
      () => 'permanent',
    ]
    for (const value of junk) {
      expect(resolveDeleteMethod(value)).toBe('trash')
    }
  })

  it('never invents a third method', () => {
    const inputs: unknown[] = ['permanent', 'trash', undefined, 'nonsense', 42]
    for (const value of inputs) {
      expect(['trash', 'permanent']).toContain(resolveDeleteMethod(value))
    }
  })
})

describe('defaultDeleteMethod', () => {
  it('is permanent, matching what the plain delete modal has always shown', () => {
    // Deliberately different from resolveDeleteMethod's fallback: this is the
    // pre-selected option for a user who has expressed no preference, and
    // MailMop's whole pitch is reclaiming storage. Trash does not reclaim any.
    expect(defaultDeleteMethod()).toBe('permanent')
  })
})

describe('readDeleteMethodPreference', () => {
  it('uses the same localStorage key the plain delete modal already writes', () => {
    // Both modals must share one preference so a user who picks "Move to Trash"
    // once is not surprised by a permanent delete in the other dialog.
    expect(DELETE_METHOD_PREF_KEY).toBe('deleteMethodPreference')
  })

  it('reads a stored preference of either kind', () => {
    expect(readDeleteMethodPreference('trash')).toBe('trash')
    expect(readDeleteMethodPreference('permanent')).toBe('permanent')
  })

  it('falls back to the default when nothing usable is stored', () => {
    expect(readDeleteMethodPreference(null)).toBe('permanent')
    expect(readDeleteMethodPreference(undefined)).toBe('permanent')
    expect(readDeleteMethodPreference('garbage')).toBe('permanent')
    expect(readDeleteMethodPreference('Trash')).toBe('permanent')
  })
})

describe('isReversible', () => {
  it('marks trash reversible and permanent not', () => {
    expect(isReversible('trash')).toBe(true)
    expect(isReversible('permanent')).toBe(false)
  })
})

describe('deleteMethodCopy', () => {
  it('gives permanent deletes the delete vocabulary and a red tone', () => {
    const copy = deleteMethodCopy('permanent')
    expect(copy.verb).toBe('Delete')
    expect(copy.progressVerb).toBe('Deleting')
    expect(copy.tone).toBe('red')
  })

  it('gives trash its own vocabulary and the orange tone the trash flow uses', () => {
    const copy = deleteMethodCopy('trash')
    expect(copy.verb).toBe('Trash')
    expect(copy.progressVerb).toBe('Moving to Trash')
    expect(copy.tone).toBe('orange')
  })

  it('labels the method exactly as DeleteConfirmModal always has', () => {
    // These strings are the option labels AND the confirm button label in both
    // dialogs. They are asserted verbatim because the two modals now render from
    // this one place, and a drift here is a drift between the two dialogs.
    expect(deleteMethodCopy('trash').methodLabel).toBe('Move to Trash')
    expect(deleteMethodCopy('permanent').methodLabel).toBe('Permanently Delete')
  })

  it('carries the same callout DeleteConfirmModal shows, verbatim', () => {
    expect(deleteMethodCopy('trash').callout).toBe(
      'Trash label will be applied - emails will auto-delete in 30 days. Gmail storage will not free up until deletion.'
    )
    expect(deleteMethodCopy('permanent').callout).toBe(
      'This action cannot be undone. Emails will be permanently deleted.'
    )
  })

  it('badges the callout as info for trash and a warning for permanent', () => {
    expect(deleteMethodCopy('trash').calloutBadge).toBe('\u2139')
    expect(deleteMethodCopy('permanent').calloutBadge).toBe('\u26a0')
  })

  it('never tells a trash user the action is permanent', () => {
    // The single most damaging copy bug available here: scaring a user out of a
    // recoverable action, or worse, reassuring them about an unrecoverable one.
    const trash = deleteMethodCopy('trash').callout.toLowerCase()
    expect(trash).not.toContain('permanent')
    expect(trash).not.toContain('cannot be undone')
    expect(trash).toContain('30 days')
  })

  it('warns trash users that storage is not reclaimed yet', () => {
    // Gmail counts trashed mail against the quota until it is purged. A user
    // trashing to free space needs to know that up front.
    expect(deleteMethodCopy('trash').callout.toLowerCase()).toContain('storage')
  })

  it('keeps the permanent warning unambiguous', () => {
    const permanent = deleteMethodCopy('permanent').callout.toLowerCase()
    expect(permanent).toContain('permanent')
    expect(permanent).toContain('cannot be undone')
    expect(permanent).not.toContain('30 days')
  })

  it('heads the filter builder with the matching verb', () => {
    expect(deleteMethodCopy('permanent').criteriaHeading).toBe(
      'Delete emails that match these criteria:'
    )
    expect(deleteMethodCopy('trash').criteriaHeading).toBe(
      'Trash emails that match these criteria:'
    )
  })
})

describe('confirmWarningHeadline', () => {
  it('describes a permanent delete', () => {
    expect(confirmWarningHeadline('permanent', 'emails that are unread')).toBe(
      'About to delete emails that are unread'
    )
  })

  it('describes a trash run as a move, not a delete', () => {
    expect(confirmWarningHeadline('trash', 'emails that are unread')).toBe(
      'About to move emails that are unread to trash'
    )
  })

  it('reads correctly with the unfiltered summary too', () => {
    expect(confirmWarningHeadline('trash', 'all 412 emails')).toBe(
      'About to move all 412 emails to trash'
    )
    expect(confirmWarningHeadline('permanent', 'all 412 emails')).toBe(
      'About to delete all 412 emails'
    )
  })
})

describe('completionToast', () => {
  it('reports a permanent delete as deleted', () => {
    const toast = completionToast('permanent', { emailsProcessed: 1234, senderCount: 2 })
    expect(toast.title).toBe('Filtered Deletion Complete')
    expect(toast.description).toContain('1,234')
    expect(toast.description).toContain('deleted')
    expect(toast.description).toContain('2 sender(s)')
  })

  it('reports a trash run as moved to trash, and says it is recoverable', () => {
    const toast = completionToast('trash', { emailsProcessed: 58, senderCount: 1 })
    expect(toast.title).toBe('Moved to Trash')
    expect(toast.description).toContain('58')
    expect(toast.description.toLowerCase()).toContain('trash')
    expect(toast.description).not.toContain('deleted')
    expect(toast.description).toContain('30 days')
  })

  it('handles the nothing-matched case for both methods', () => {
    const permanent = completionToast('permanent', { emailsProcessed: 0, senderCount: 3 })
    const trash = completionToast('trash', { emailsProcessed: 0, senderCount: 3 })
    for (const toast of [permanent, trash]) {
      expect(toast.description).toContain('No emails')
      expect(toast.description).toContain('3 sender(s)')
    }
    // A zero-result run must not claim anything was destroyed or moved.
    expect(permanent.description).not.toContain('deleted 0')
    expect(trash.description).not.toContain('30 days')
  })
})

describe('queueJobTitle', () => {
  it('distinguishes the two runs in the process queue', () => {
    expect(queueJobTitle('permanent', '3 Senders')).toBe(
      'Delete with exceptions for 3 Senders'
    )
    expect(queueJobTitle('trash', '3 Senders')).toBe(
      'Trash with exceptions for 3 Senders'
    )
  })

  it('resolves an unknown method the same fail-safe way the executor does', () => {
    // The queue renders titles straight off a payload; it must not label a run
    // "Delete" when the executor is going to trash it.
    expect(queueJobTitle(resolveDeleteMethod(undefined), '1 Sender')).toBe(
      'Trash with exceptions for 1 Sender'
    )
  })
})

describe('the two fallbacks together', () => {
  it('keeps the preference default and the execution fallback independent', () => {
    // These deliberately disagree. The preference default is a UI convenience;
    // the execution fallback is a safety net. Collapsing them into one constant
    // would either make trash the pre-selected option or make a mangled payload
    // permanently delete mail.
    expect(defaultDeleteMethod()).toBe('permanent')
    expect(resolveDeleteMethod(undefined)).toBe('trash')
  })

  it('round-trips every method through storage and resolution', () => {
    const methods: DeleteMethod[] = ['trash', 'permanent']
    for (const method of methods) {
      expect(readDeleteMethodPreference(method)).toBe(method)
      expect(resolveDeleteMethod(method)).toBe(method)
    }
  })
})
