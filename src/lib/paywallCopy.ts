/**
 * Copy for the premium feature paywall.
 *
 * 85% of paywall impressions come from `delete`, and every converter so far came
 * from `delete`. The other gated features (delete_with_exceptions, mark_read,
 * block_sender, apply_label) account for the remaining 15% and have produced zero
 * conversions between them.
 *
 * Buyers and non-buyers hit the paywall the same number of times (median 2 each),
 * so repetition is not what converts. The first impression is the whole pitch.
 * That makes it worth spending the delete headline on the user's actual numbers
 * rather than a generic feature name: at the moment the modal opens we already
 * know the sender and how many of their emails are sitting in the inbox.
 *
 * Everything here is a pure function of the context so it can be tested without
 * rendering, and so the fallbacks are explicit rather than accidental.
 */

export interface PaywallContext {
  /** Feature key, e.g. 'delete', 'mark_read'. */
  feature: string
  /** How many senders the pending action targets. */
  senderCount: number
  /** Total emails across those senders, when known. */
  emailCount?: number | null
  /** Display name of the single sender, when the action targets exactly one. */
  senderName?: string | null
}

export interface PaywallCopy {
  title: string
  subtitle: string
  /** True when we managed to use the user's real numbers. Useful for analytics. */
  isQuantified: boolean
}

/** Title-cases a feature key for display: 'delete_with_exceptions' -> 'Delete With Exceptions'. */
export function formatFeatureName(feature: string): string {
  return feature
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const fmt = (n: number) => n.toLocaleString('en-US')

/**
 * Generic copy, unchanged from the original modal. Used for every non-delete
 * feature and as the fallback whenever we lack trustworthy numbers.
 */
function genericCopy(feature: string): PaywallCopy {
  const name = formatFeatureName(feature)
  return {
    title: `Upgrade to Use ${name}`,
    subtitle: `Instantly unlock ${name} and our full suite of one-click actions to save hundreds of hours. Cheaper than a donut.`,
    isQuantified: false,
  }
}

/**
 * Whether we have enough real data to quantify the headline.
 *
 * Deliberately strict. A headline that says "Delete 0 emails" or "Delete emails
 * from undefined" is worse than the generic version, so anything missing or
 * implausible falls back.
 */
export function canQuantify(ctx: PaywallContext): boolean {
  if (ctx.feature !== 'delete') return false
  if (typeof ctx.emailCount !== 'number') return false
  if (!Number.isFinite(ctx.emailCount) || ctx.emailCount <= 0) return false
  if (!Number.isFinite(ctx.senderCount) || ctx.senderCount <= 0) return false
  return true
}

export function buildPaywallCopy(ctx: PaywallContext): PaywallCopy {
  if (!canQuantify(ctx)) return genericCopy(ctx.feature)

  const emails = ctx.emailCount as number
  const name = (ctx.senderName || '').trim()

  // One sender whose name we know: the most specific, most persuasive case.
  const target =
    ctx.senderCount === 1 && name
      ? name
      : `${fmt(ctx.senderCount)} sender${ctx.senderCount === 1 ? '' : 's'}`

  return {
    title: `Delete ${fmt(emails)} email${emails === 1 ? '' : 's'} from ${target}`,
    subtitle: `MailMop Pro clears them in one click, and every other sender cluttering your inbox. $22.68 for the year.`,
    isQuantified: true,
  }
}
