import { parse } from 'tldts'

/**
 * Returns the registrable/root domain for a given email or hostname.
 * Falls back gracefully if parsing fails.
 */
export function getRootDomainFromEmail(emailOrHost: string): string {
  const atIndex = emailOrHost.indexOf('@')
  const host = atIndex === -1 ? emailOrHost : emailOrHost.slice(atIndex + 1)

  try {
    const { domain } = parse(host.toLowerCase())
    return domain || host.toLowerCase()
  } catch {
    return host.toLowerCase()
  }
} 