/**
 * gmailUrl.ts
 *
 * Builds the "View in Gmail" / "Preview" deep links.
 *
 * These used to be `mail.google.com/mail/u/{email}/#search/...`. Google removed
 * support for an email address in the `/mail/u/` path segment, and that form now
 * returns "Temporary Error (404)" for every address — including accounts that are
 * signed into the browser right now, so it is the URL shape that is dead, not a
 * session problem.
 *
 * `?authuser={email}` is the replacement. It still resolves to the right mailbox
 * by address (Gmail rewrites it to the matching `/mail/u/{n}/`), and when that
 * account is not signed into the browser it quietly falls back to `/mail/u/0/`
 * instead of erroring — a much better landing than the 404 page.
 */

/** Gmail's own search operators, e.g. `from:a@b.com OR from:c@d.com`. */
export type GmailQuery = string

/**
 * A Gmail search URL scoped to `userEmail`'s mailbox.
 *
 * The whole query is encoded exactly once, here. Callers pass raw Gmail search
 * syntax and must NOT pre-encode any part of it — half-encoded queries were the
 * previous bug, where sender addresses were escaped but the ` OR ` joining them
 * was not.
 */
export function buildGmailSearchUrl(userEmail: string, query: GmailQuery): string {
  const authuser = encodeURIComponent(userEmail)
  return `https://mail.google.com/mail/?authuser=${authuser}#search/${encodeURIComponent(query)}`
}

/** Search for everything from a single sender. */
export function senderQuery(email: string): GmailQuery {
  return `from:${email}`
}

/**
 * Search for everything from any of several senders.
 *
 * Parenthesised so the ORs stay grouped — an unwrapped `from:a OR from:b` is fine
 * on its own, but the moment anything is appended Gmail binds the OR to the last
 * term only.
 */
export function multiSenderQuery(emails: string[]): GmailQuery {
  return emails.length === 1
    ? senderQuery(emails[0])
    : `(${emails.map(senderQuery).join(' OR ')})`
}
