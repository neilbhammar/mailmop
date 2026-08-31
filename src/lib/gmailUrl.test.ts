import { describe, it, expect } from 'vitest'
import { buildGmailSearchUrl, senderQuery, multiSenderQuery } from './gmailUrl'

/**
 * The regression these exist to prevent: shipping the `/mail/u/{email}/` form
 * again. Google 404s it unconditionally, and because the link opens in a new tab
 * nothing in the app surfaces the failure — it looks fine until a user reports it.
 */
describe('buildGmailSearchUrl', () => {
  it('addresses the mailbox with authuser, never a path segment', () => {
    const url = buildGmailSearchUrl('neil@example.com', 'from:a@b.com')
    expect(url).toContain('authuser=neil%40example.com')
    // The dead format, in every shape it could sneak back in.
    expect(url).not.toContain('/mail/u/neil')
    expect(url).not.toMatch(/\/mail\/u\/[^0-9]/)
  })

  it('puts the query in the hash, where Gmail reads it', () => {
    const url = buildGmailSearchUrl('neil@example.com', 'from:a@b.com')
    expect(url).toBe(
      'https://mail.google.com/mail/?authuser=neil%40example.com#search/from%3Aa%40b.com'
    )
  })

  it('encodes an address that needs escaping', () => {
    const url = buildGmailSearchUrl('neil+mailmop@example.com', 'from:x@y.com')
    expect(url).toContain('authuser=neil%2Bmailmop%40example.com')
  })

  it('encodes the whole query once — operators, spaces and all', () => {
    const url = buildGmailSearchUrl('neil@example.com', '(from:a@b.com) is:unread')
    const hash = url.split('#search/')[1]
    expect(hash).toBe('(from%3Aa%40b.com)%20is%3Aunread')
    // Single-encoded: a double pass would turn % into %25.
    expect(hash).not.toContain('%25')
    expect(decodeURIComponent(hash)).toBe('(from:a@b.com) is:unread')
  })

  it('leaves no raw spaces in the URL', () => {
    const url = buildGmailSearchUrl('neil@example.com', 'from:a@b.com OR from:c@d.com')
    expect(url).not.toContain(' ')
  })
})

describe('multiSenderQuery', () => {
  it('does not parenthesise a single sender', () => {
    expect(multiSenderQuery(['a@b.com'])).toBe('from:a@b.com')
  })

  it('groups multiple senders so a later term cannot bind to the last OR', () => {
    expect(multiSenderQuery(['a@b.com', 'c@d.com'])).toBe(
      '(from:a@b.com OR from:c@d.com)'
    )
  })

  it('round-trips through the URL builder intact', () => {
    const query = multiSenderQuery(['a@b.com', 'c@d.com', 'e@f.com'])
    const hash = buildGmailSearchUrl('neil@example.com', query).split('#search/')[1]
    expect(decodeURIComponent(hash)).toBe(
      '(from:a@b.com OR from:c@d.com OR from:e@f.com)'
    )
  })
})

describe('senderQuery', () => {
  it('builds a raw, unencoded from: operator', () => {
    // Raw is the contract — buildGmailSearchUrl owns the only encode pass.
    expect(senderQuery('a@b.com')).toBe('from:a@b.com')
  })
})
