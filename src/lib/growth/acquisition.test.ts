import { describe, it, expect } from 'vitest';
import { acquisitionChannel, captureAcquisition, readAcquisition, ACQUISITION_KEY, SESSION_MS } from './acquisition';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('acquisition attribution', () => {
  it('keeps the original article through internal navigation and OAuth', () => {
    const store = storage();
    const first = captureAcquisition(store, new URL('https://mailmop.com/blog/clean-up-gmail?email=private#secret'), 'https://www.google.com/search?q=private', 100);
    expect(first).toEqual({ landing: '/blog/clean-up-gmail', channel: 'google', at: 100 });
    expect(captureAcquisition(store, new URL('https://mailmop.com/'), 'https://mailmop.com/blog/clean-up-gmail', 200)).toEqual(first);
    expect(captureAcquisition(store, new URL('https://mailmop.com/dashboard?code=secret'), 'https://accounts.google.com/', 300)).toEqual(first);
    expect(store.getItem(ACQUISITION_KEY)).not.toMatch(/private|secret|email|referrer/);
  });
  it('does not mistake tagged ads or lookalike domains for organic Google', () => {
    expect(acquisitionChannel('https://www.google.com/', new URL('https://mailmop.com/?gclid=secret'))).toBe('paid');
    expect(acquisitionChannel('https://www.google.com/', new URL('https://mailmop.com/?utm_medium=cpc'))).toBe('paid');
    expect(acquisitionChannel('https://google.com.attacker.test/', new URL('https://mailmop.com/'))).toBe('referral');
    expect(acquisitionChannel('https://www.google.co.uk/', new URL('https://mailmop.com/'))).toBe('google');
    expect(acquisitionChannel('https://accounts.google.com/', new URL('https://mailmop.com/'))).toBe('referral');
  });
  it('expires and rejects corrupt, future, or private-page attribution', () => {
    const store = storage();
    captureAcquisition(store, new URL('https://mailmop.com/'), '', 100);
    expect(readAcquisition(store, 100 + SESSION_MS)).toBeNull();
    expect(readAcquisition(store, 99)).toBeNull();
    store.setItem(ACQUISITION_KEY, '{bad');
    expect(readAcquisition(store)).toBeNull();
    store.setItem(ACQUISITION_KEY, JSON.stringify({ landing: '/dashboard', channel: 'google', at: 100 }));
    expect(readAcquisition(store, 200)).toBeNull();
    expect(captureAcquisition(storage(), new URL('https://mailmop.com/dashboard?code=secret'), '', 100)).toBeNull();
  });
  it('does not throw if browser storage is unavailable', () => {
    const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
    expect(() => captureAcquisition(blocked, new URL('https://mailmop.com/'), '', 100)).not.toThrow();
  });
});
