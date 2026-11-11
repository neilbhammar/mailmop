import { describe, it, expect } from 'vitest'
import { describeArchiveResult } from './archiveCopy'
import type { ArchiveSendersResult } from './archiveSenders'

const result = (over: Partial<ArchiveSendersResult>): ArchiveSendersResult => ({
  endType: 'success',
  archivedCount: 0,
  perSender: {},
  skippedSenders: [],
  ...over,
})

describe('describeArchiveResult', () => {
  it('celebrates a normal run and says where the mail went', () => {
    const msg = describeArchiveResult(result({ archivedCount: 1234, perSender: { 'a@x.com': 1000, 'b@y.com': 234 } }))
    expect(msg.kind).toBe('success')
    expect(msg.title).toBe('Archived 1,234 emails')
    expect(msg.description).toMatch(/2 senders/)
    expect(msg.description).toMatch(/All Mail/)
  })

  it('uses singular wording for one email from one sender', () => {
    const msg = describeArchiveResult(result({ archivedCount: 1, perSender: { 'a@x.com': 1 } }))
    expect(msg.title).toBe('Archived 1 email')
    expect(msg.description).toMatch(/1 sender\b/)
  })

  it('explains an empty run instead of claiming success', () => {
    const msg = describeArchiveResult(result({ perSender: { 'a@x.com': 0 } }))
    expect(msg.kind).toBe('info')
    expect(msg.title).toBe('Nothing to archive')
    expect(msg.description).toMatch(/this sender/)
  })

  it('pluralises the empty-run message for several senders', () => {
    const msg = describeArchiveResult(result({ perSender: { 'a@x.com': 0, 'b@y.com': 0 } }))
    expect(msg.description).toMatch(/these senders/)
  })

  it('mentions senders that were skipped', () => {
    const msg = describeArchiveResult(
      result({ archivedCount: 3, perSender: { 'a@x.com': 3 }, skippedSenders: ['weird sender'] })
    )
    expect(msg.kind).toBe('warning')
    expect(msg.description).toMatch(/Skipped 1 sender/)
  })

  it('reports a stop with what was done before it', () => {
    const msg = describeArchiveResult(result({ endType: 'user_stopped', archivedCount: 2000 }))
    expect(msg.kind).toBe('info')
    expect(msg.title).toBe('Archive stopped')
    expect(msg.description).toMatch(/2,000 emails/)
  })

  it('reports a failure, and how far it got when it got anywhere', () => {
    const none = describeArchiveResult(result({ endType: 'runtime_error', error: 'boom' }))
    expect(none.kind).toBe('error')
    expect(none.description).toMatch(/boom/)
    expect(none.description).not.toMatch(/before/)

    const partial = describeArchiveResult(result({ endType: 'runtime_error', archivedCount: 1000, error: 'boom' }))
    expect(partial.description).toMatch(/1,000 emails were archived before/)
  })
})
