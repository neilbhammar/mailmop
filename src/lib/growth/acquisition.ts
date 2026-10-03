// Session-scoped first touch. Never store queries, email addresses, or full referrers.
export const ACQUISITION_KEY = 'mailmop-acquisition-v1';
export const SESSION_MS = 30 * 60 * 1000;
export const CHANNELS = ['google', 'search', 'paid', 'referral', 'direct', 'internal'] as const;
export type Channel = typeof CHANNELS[number];
export interface Acquisition { landing: string; channel: Channel; at: number }

export function publicLanding(path: string): string | null {
  return path === '/' || path === '/blog' || /^\/blog\/[a-z0-9-]{1,100}$/.test(path) ? path : null;
}

export function acquisitionChannel(referrer: string, url: URL): Channel {
  if (['gclid', 'dclid', 'msclkid', 'gbraid', 'wbraid'].some(key => url.searchParams.has(key)) ||
      /^(cpc|ppc|paid|paid_search|paidsearch|display|paid_social)$/i.test(url.searchParams.get('utm_medium') || '')) return 'paid';
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname;
    if (host.replace(/^www\./, '') === url.hostname.replace(/^www\./, '')) return 'internal';
    if (/^(www\.)?google\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/.test(host)) return 'google';
    if (/^(www\.)?(bing\.com|duckduckgo\.com|search\.yahoo\.com|search\.brave\.com|ecosia\.org)$/.test(host)) return 'search';
    return 'referral';
  } catch { return 'direct'; }
}

export function readAcquisition(storage: Pick<Storage, 'getItem'>, now = Date.now()): Acquisition | null {
  try {
    const value = JSON.parse(storage.getItem(ACQUISITION_KEY) || 'null');
    if (!value || typeof value.landing !== 'string' || !publicLanding(value.landing) ||
        !CHANNELS.includes(value.channel) || !Number.isFinite(value.at) || value.at > now || now - value.at >= SESSION_MS) return null;
    return { landing: value.landing, channel: value.channel, at: value.at };
  } catch { return null; }
}

export function captureAcquisition(storage: Pick<Storage, 'getItem' | 'setItem'>, url: URL, referrer: string, now = Date.now()): Acquisition | null {
  const existing = readAcquisition(storage, now);
  if (existing) return existing;
  const landing = publicLanding(url.pathname);
  if (!landing) return null;
  const value: Acquisition = { landing, channel: acquisitionChannel(referrer, url), at: now };
  try { storage.setItem(ACQUISITION_KEY, JSON.stringify(value)); } catch { /* Storage can be disabled. */ }
  return value;
}

export function currentAcquisition(): Acquisition | null {
  try { return typeof window === 'undefined' ? null : readAcquisition(window.sessionStorage); }
  catch { return null; }
}
