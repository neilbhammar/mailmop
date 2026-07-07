import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

export const runtime = 'edge';

/** Mobile Gmail token refresh — accepts refresh_token in JSON body. */
export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, RATE_LIMITS.AUTH);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const { refresh_token: refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'no_refresh', message: 'No refresh token provided' },
        { status: 401 }
      );
    }

    const tokenData = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    });

    const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenData.toString(),
    });

    const tokens = await googleResponse.json();

    if (!googleResponse.ok) {
      return NextResponse.json(
        { error: tokens.error, message: tokens.error_description || 'Failed to refresh token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    });
  } catch (error) {
    console.error('Mobile token refresh error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error during token refresh' },
      { status: 500 }
    );
  }
}
