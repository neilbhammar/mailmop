import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

export const runtime = 'edge';

/**
 * Mobile Gmail token exchange — returns refresh_token in the response body
 * so the native app can store it in SecureStore (no httpOnly cookies).
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, RATE_LIMITS.AUTH);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const { code, redirectUri } = await request.json();

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'code and redirectUri are required' },
        { status: 400 }
      );
    }

    const tokenData = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenData.toString(),
    });

    const tokens = await googleResponse.json();

    if (!googleResponse.ok) {
      return NextResponse.json(
        { error: 'token_error', message: tokens.error_description || 'Failed to exchange code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token,
    });
  } catch (error) {
    console.error('Mobile token exchange error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error during token exchange' },
      { status: 500 }
    );
  }
}
