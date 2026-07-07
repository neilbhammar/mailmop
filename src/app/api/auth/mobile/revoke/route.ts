import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

export const runtime = 'edge';

/** Mobile Gmail token revoke — accepts refresh_token in JSON body. */
export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, RATE_LIMITS.AUTH);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const { refresh_token: refreshToken } = await request.json();

    if (refreshToken) {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mobile token revoke error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error during token revoke' },
      { status: 500 }
    );
  }
}
