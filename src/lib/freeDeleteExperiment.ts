/**
 * "One free delete" experiment.
 *
 * Hypothesis: at $22.68/yr the blocker is not price, it is doubt. A free user
 * analyses their inbox, sees ~22,000 emails of clutter, and hits a hard wall
 * having never watched MailMop delete a single message. Letting them clear one
 * sender answers "does this actually work, and is it safe to point at my inbox"
 * in about ten seconds.
 *
 * Arms (50/50, deterministic on user_id):
 *   control     - current behaviour, delete is fully gated
 *   free_delete - one delete, one sender, once, however many emails that sender has
 *
 * ------------------------------------------------------------------------
 * SAFETY NOTES. Read before changing anything in this file.
 * ------------------------------------------------------------------------
 *
 * 1. THIS GATES A DESTRUCTIVE, IRREVERSIBLE ACTION. Deleted mail is gone. Every
 *    decision here fails CLOSED: anything unknown, missing, malformed or
 *    out-of-range denies. There is no default-allow path.
 *
 * 2. QUOTA LIVES SERVER-SIDE, in profiles.free_delete_used_at. It deliberately
 *    does NOT live in localStorage like the discount experiment does. Leaking a
 *    discount code costs a few dollars; leaking unlimited free deletes gives away
 *    the product to anyone who clears site data.
 *
 * 3. ENFORCEMENT IS CLIENT-SIDE BY NECESSITY and that is a known, accepted limit.
 *    Deletes execute in the browser against the user's own Gmail token; MailMop's
 *    server never performs them, so it cannot refuse them. A determined user can
 *    bypass this, which is already true of the whole product (it is open source
 *    and runs on your own credentials). The server-side quota stops the casual
 *    case: clearing storage, or using a second device.
 *
 * 4. THE QUOTA IS CONSUMED WHEN THE DELETE STARTS, not when it succeeds. A user
 *    whose delete crashes mid-run loses their free one. That is the deliberate
 *    trade: the alternative is a retry loop an abuser can farm. Runtime errors
 *    run at about 3.6% of operations, so this is rare, and support can clear
 *    free_delete_used_at by hand.
 *
 * Full writeup: docs/experiments/2026-08-free-delete-ab-test.md
 */

export type FreeDeleteVariant = 'control' | 'free_delete'

/*
 * There is deliberately NO cap on the number of emails.
 *
 * A cap would have been close to theatre: emailCount is supplied by the client
 * and is only ever RECORDED, never enforced against the delete that actually
 * runs. The delete removes whatever that sender has either way. The constraint
 * that genuinely binds is "exactly one sender", and that IS enforced below.
 *
 * The business call is Neil's: one sender's worth is an acceptable giveaway.
 */

/** Salt is part of the experiment's identity. Changing it reshuffles every user. */
const EXPERIMENT_SALT = 'free-delete-2026-08'

export type FreeDeleteDenialReason =
  /** No user id / profile not loaded yet. */
  | 'missing_profile'
  /** Already paying. They do not need a freebie and must not burn the quota. */
  | 'already_pro'
  /** Control arm. */
  | 'not_in_experiment'
  /** They already used their one free delete. */
  | 'quota_used'
  /** Nothing selected. */
  | 'no_target'
  /** Free delete covers exactly one sender. */
  | 'multiple_senders'
  /** We do not have a trustworthy email count, so we will not delete. */
  | 'unknown_count'

export type FreeDeleteDecision =
  | { allowed: true; variant: 'free_delete'; senderEmail: string; emailCount: number }
  | { allowed: false; variant: FreeDeleteVariant | null; reason: FreeDeleteDenialReason }

export interface FreeDeleteInput {
  userId: string | null | undefined
  /** profiles.plan */
  plan: string | null | undefined
  /** profiles.free_delete_used_at. Any non-null value means the quota is spent. */
  freeDeleteUsedAt: string | null | undefined
  /** Sender addresses the pending delete targets. */
  targetSenders: string[] | null | undefined
  /** Total emails across those senders, as displayed to the user. */
  emailCount: number | null | undefined
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Deterministic 50/50 assignment. Stable per user, across devices, forever. */
export function assignFreeDeleteVariant(userId: string): FreeDeleteVariant {
  return fnv1a(`${EXPERIMENT_SALT}:${userId}`) % 100 < 50 ? 'free_delete' : 'control'
}

/**
 * The single decision point for whether a free delete may proceed.
 *
 * Order matters and is defensive on purpose:
 *   profile -> pro -> arm -> quota -> target -> count
 *
 * `already_pro` is checked before the arm so a Pro user never consumes quota and
 * never appears in experiment results. `quota_used` is checked before anything
 * about the target so a spent user gets a stable reason regardless of selection.
 */
export function evaluateFreeDelete(input: FreeDeleteInput): FreeDeleteDecision {
  const { userId, plan, freeDeleteUsedAt, targetSenders, emailCount } = input

  if (!userId) return { allowed: false, variant: null, reason: 'missing_profile' }

  // Pro users are outside the experiment entirely.
  if (plan === 'pro') return { allowed: false, variant: null, reason: 'already_pro' }

  const variant = assignFreeDeleteVariant(userId)
  if (variant !== 'free_delete') return { allowed: false, variant, reason: 'not_in_experiment' }

  // Any non-null value means spent. Never parse it into a date and compare:
  // a malformed timestamp must not read as "unused".
  if (freeDeleteUsedAt != null && freeDeleteUsedAt !== '') {
    return { allowed: false, variant, reason: 'quota_used' }
  }

  const senders = targetSenders ?? []
  if (senders.length === 0) return { allowed: false, variant, reason: 'no_target' }
  if (senders.length > 1) return { allowed: false, variant, reason: 'multiple_senders' }

  const senderEmail = (senders[0] ?? '').trim()
  if (!senderEmail) return { allowed: false, variant, reason: 'no_target' }

  // Still required, but as a sanity check on the value we record, not as a limit.
  if (
    typeof emailCount !== 'number' ||
    !Number.isFinite(emailCount) ||
    !Number.isInteger(emailCount) ||
    emailCount <= 0
  ) {
    return { allowed: false, variant, reason: 'unknown_count' }
  }

  return { allowed: true, variant: 'free_delete', senderEmail, emailCount }
}

/**
 * Copy shown after a successful free delete. Honest about what happened and what
 * it costs to keep going, without pretending the freebie was a permanent feature.
 */
export function freeDeleteSuccessMessage(emailCount: number, senderName: string): string {
  const n = emailCount.toLocaleString('en-US')
  return `Deleted ${n} email${emailCount === 1 ? '' : 's'} from ${senderName}. That one was on us. MailMop Pro clears the rest of your inbox for $22.68 a year.`
}
