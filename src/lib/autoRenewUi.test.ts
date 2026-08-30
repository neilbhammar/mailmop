import { describe, it, expect } from 'vitest'
import {
  autoRenewStateOf,
  isRowClickable,
  nextStageOnDisableClick,
  shouldCallDisable,
  resetStage,
  disableLinkLabel,
  disableConfirmHelp,
  showsCallout,
  showsSectionHeading,
  renewalSummary,
  type DisableStage,
} from './autoRenewUi'

describe('autoRenewStateOf', () => {
  it('reads cancel_at_period_end === false as enabled', () => {
    expect(autoRenewStateOf(false)).toBe('enabled')
  })

  it('reads cancel_at_period_end === true as disabled', () => {
    expect(autoRenewStateOf(true)).toBe('disabled')
  })

  it('treats null and undefined as disabled, matching prior rendering', () => {
    expect(autoRenewStateOf(null)).toBe('disabled')
    expect(autoRenewStateOf(undefined)).toBe('disabled')
  })
})

describe('isRowClickable', () => {
  it('makes the big row clickable only when it would ENABLE auto-renew', () => {
    expect(isRowClickable('disabled')).toBe(true)
  })

  it('does not make the row a button when auto-renew is already on', () => {
    // The regression this exists to prevent: a single exploratory click on a
    // status row silently changing the setting.
    expect(isRowClickable('enabled')).toBe(false)
  })
})

describe('disable confirmation flow', () => {
  it('does not call Stripe on the first click', () => {
    const stage: DisableStage = 'idle'
    expect(shouldCallDisable(stage)).toBe(false)
  })

  it('arms the confirm on the first click', () => {
    expect(nextStageOnDisableClick('idle')).toBe('confirming')
  })

  it('calls Stripe only on the second click', () => {
    const armed = nextStageOnDisableClick('idle')
    expect(shouldCallDisable(armed)).toBe(true)
  })

  it('takes exactly two clicks to disable, never one', () => {
    let stage: DisableStage = 'idle'
    let calls = 0

    // Simulate two clicks through the real state transitions.
    for (let i = 0; i < 2; i++) {
      if (shouldCallDisable(stage)) calls++
      stage = nextStageOnDisableClick(stage)
    }
    expect(calls).toBe(1)

    // And a single click on its own does nothing.
    let solo: DisableStage = 'idle'
    let soloCalls = 0
    if (shouldCallDisable(solo)) soloCalls++
    expect(soloCalls).toBe(0)
  })

  it('stays armed on repeat clicks rather than toggling back to idle', () => {
    expect(nextStageOnDisableClick('confirming')).toBe('confirming')
  })

  it('disarms on reset, so reopening the modal starts safe', () => {
    expect(resetStage()).toBe('idle')
    expect(shouldCallDisable(resetStage())).toBe(false)
  })
})

describe('copy', () => {
  it('labels the two stages distinctly so the confirm is unmistakable', () => {
    expect(disableLinkLabel('idle')).toBe('Turn off auto-renewal')
    expect(disableLinkLabel('confirming')).toBe('Confirm: turn off auto-renewal')
    expect(disableLinkLabel('idle')).not.toBe(disableLinkLabel('confirming'))
  })

  it('states when access ends and that it is reversible', () => {
    const help = disableConfirmHelp('June 16, 2027')
    expect(help).toContain('June 16, 2027')
    expect(help).toContain('turn it back on')
  })

  it('falls back cleanly when the expiry date is unknown', () => {
    const help = disableConfirmHelp(null)
    expect(help).toContain('end of the current period')
    expect(help).toContain('turn it back on')
    expect(help).not.toContain('null')
  })

  it('never claims access ends immediately, which would be false', () => {
    for (const label of ['June 16, 2027', null]) {
      expect(disableConfirmHelp(label).toLowerCase()).not.toContain('immediately')
    }
  })
})

describe('visual weight is asymmetric by state', () => {
  it('shows the callout box only when auto-renew is OFF', () => {
    expect(showsCallout('disabled')).toBe(true)
    // Three stacked elements pointing at a setting the user did not come looking
    // for is what makes them reach for it. ON state stays quiet.
    expect(showsCallout('enabled')).toBe(false)
  })

  it('shows the section heading only when auto-renew is OFF', () => {
    expect(showsSectionHeading('disabled')).toBe(true)
    expect(showsSectionHeading('enabled')).toBe(false)
  })

  it('never renders callout and heading in the ON state', () => {
    const chrome = [showsCallout('enabled'), showsSectionHeading('enabled'), isRowClickable('enabled')]
    expect(chrome.every((v) => v === false)).toBe(true)
  })

  it('keeps the full treatment in the OFF state', () => {
    const chrome = [showsCallout('disabled'), showsSectionHeading('disabled'), isRowClickable('disabled')]
    expect(chrome.every((v) => v === true)).toBe(true)
  })
})

describe('renewalSummary', () => {
  it('leads with the date when known', () => {
    const { lead, date } = renewalSummary('August 30, 2027')
    expect(lead).toBe('Renews automatically on')
    expect(date).toBe('August 30, 2027')
  })

  it('falls back without a dangling preposition when the date is unknown', () => {
    const { lead, date } = renewalSummary(null)
    expect(date).toBeNull()
    expect(lead).not.toMatch(/\bon$/)
    expect(lead).toBe('Renews automatically each year')
  })
})
