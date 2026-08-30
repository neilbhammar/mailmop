/**
 * Interaction rules for the auto-renewal control in ManageSubscriptionModal.
 *
 * The previous version made the entire "Auto-renewal is enabled" row a single
 * large button, so the enable and disable affordances looked identical and one
 * click anywhere on the row toggled the setting with no confirmation. Users
 * opening the modal simply to check their renewal date could change it by
 * accident and only find out later.
 *
 * The rules below make the two directions deliberately asymmetric:
 *
 *   enabling  - still one click on a large, friendly target
 *   disabling - a small secondary link, then an explicit confirm
 *
 * Turning auto-renewal off stays available, in the same place, in plain language,
 * and the confirm states exactly when access ends and that it is reversible. The
 * goal is to make the change intentional, not to make it hard.
 */

export type AutoRenewState = 'enabled' | 'disabled'

/** Two-step flow guarding the disable direction. */
export type DisableStage = 'idle' | 'confirming'

/**
 * Reads the profile field. `cancel_at_period_end === false` means auto-renew is on.
 * Null/undefined (a profile that predates the column, or a failed webhook write) is
 * treated as disabled, matching how the modal has always rendered it.
 */
export function autoRenewStateOf(cancelAtPeriodEnd: boolean | null | undefined): AutoRenewState {
  return cancelAtPeriodEnd === false ? 'enabled' : 'disabled'
}

/**
 * Whether the whole row should behave as one big click target.
 *
 * Only when auto-renew is off, where the click turns it ON. When it is already on,
 * the row is a status display and the disable action lives in its own small link.
 */
export function isRowClickable(state: AutoRenewState): boolean {
  return state === 'disabled'
}

/**
 * Whether to render the bordered callout box.
 *
 * Only in the OFF state, where we want the setting noticed and turned back on.
 * In the ON state a callout box plus a heading plus a link is three separate
 * elements all drawing the eye to a setting the user is unlikely to have come
 * looking for, which invites them to change something they were happy with.
 * The ON state gets one quiet line instead.
 */
export function showsCallout(state: AutoRenewState): boolean {
  return state === 'disabled'
}

/**
 * Whether to render the "Auto-Renewal Enabled/Disabled" section heading.
 * Same reasoning as showsCallout: redundant once the ON state is a single line
 * that already says what it is.
 */
export function showsSectionHeading(state: AutoRenewState): boolean {
  return state === 'disabled'
}

/**
 * The one-line renewal summary for the ON state. Split so the date can be
 * emphasised without the caller hardcoding the sentence.
 */
export function renewalSummary(expiryLabel: string | null): { lead: string; date: string | null } {
  return expiryLabel
    ? { lead: 'Renews automatically on', date: expiryLabel }
    : { lead: 'Renews automatically each year', date: null }
}

/** Advances the disable flow. The first click only arms the confirm. */
export function nextStageOnDisableClick(stage: DisableStage): DisableStage {
  return stage === 'idle' ? 'confirming' : 'confirming'
}

/**
 * Whether a click should actually hit Stripe and cancel renewal.
 *
 * False while idle. That single check is what turns a stray click into a no-op.
 */
export function shouldCallDisable(stage: DisableStage): boolean {
  return stage === 'confirming'
}

/** Leaving the section or closing the modal disarms the confirm. */
export function resetStage(): DisableStage {
  return 'idle'
}

/**
 * Copy for the disable affordance. Kept here so the wording is covered by tests
 * and cannot drift into something misleading.
 */
export function disableLinkLabel(stage: DisableStage): string {
  return stage === 'idle' ? 'Turn off auto-renewal' : 'Confirm: turn off auto-renewal'
}

/**
 * Helper text shown next to the confirm, stating exactly what happens and when.
 * `expiryLabel` is a preformatted date, or null when it is not known yet.
 */
export function disableConfirmHelp(expiryLabel: string | null): string {
  return expiryLabel
    ? `Your Pro access stays active until ${expiryLabel}, then stops. You can turn it back on any time before then.`
    : 'Your Pro access stays active until the end of the current period, then stops. You can turn it back on any time before then.'
}
