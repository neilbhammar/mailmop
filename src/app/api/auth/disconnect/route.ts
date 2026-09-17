// Drops MailMop's Gmail refresh token without revoking the grant at Google.
//
// This is the quieter half of a pair. /api/auth/revoke tells Google to forget
// MailMop entirely, which is what "Disconnect Gmail" should do. Switching to a
// different inbox only needs *this* side to forget: the user keeps their grant,
// so connecting that mailbox again later is an account-chooser click rather than
// the full consent screen.
//
// Either way the token is gone from MailMop, and the analysis on the device is
// cleared by the client before this is called.

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';
import { REFRESH_COOKIE } from '@/lib/gmail/refreshTokenPolicy';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // SECURITY: Apply rate limiting to prevent auth abuse
  const rateLimit = checkRateLimit(req, RATE_LIMITS.AUTH);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetTime);
  }

  const res = NextResponse.json({ ok: true });

  // Same clearing shape as /revoke — maxAge and expires together, root path, so
  // the cookie goes in every browser we support.
  res.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return res;
}
