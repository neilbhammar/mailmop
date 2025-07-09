// src/app/api/auth/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // SECURITY: Apply rate limiting to prevent auth abuse
  const rateLimit = checkRateLimit(req, RATE_LIMITS.AUTH);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetTime);
  }

  const refresh = req.cookies.get('mm_refresh')?.value;

  // Best‑effort revoke with Google (optional)
  if (refresh) {
    const form = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      token: refresh,
    });
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    }).catch(() => {}); // swallow errors – cookie will still be cleared
  }

  const res = NextResponse.json({ ok: true });
  
  // Clear cookie by setting maxAge 0 and using root path
  res.cookies.set('mm_refresh', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',        // Use root path to ensure we delete the cookie
    maxAge: 0,        // Expire immediately
    expires: new Date(0)  // Also set expires to ensure deletion
  });
  
  return res;
}
