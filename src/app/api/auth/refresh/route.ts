// This file handles getting new access tokens using our refresh token
// Think of it like using your renewal pass to get a new temporary pass when the old one expires

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This tells Next.js this is an Edge API Route - it runs on Vercel's edge network (super fast servers close to users)
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Get our refresh token from the secure cookie
    const refreshToken = request.cookies.get('mm_refresh')?.value;

    // If we don't have a refresh token, we can't get a new access token
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'no_refresh', message: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Set up the data we need to send to Google
    // This is like filling out a form to get a new temporary pass
    const tokenData = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    });

    // Make the request to Google's token endpoint
    // This is where we actually get our new access token
    const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenData.toString(),
    });

    // Get the response from Google
    const tokens = await googleResponse.json();

    // If something went wrong with getting the new token
    if (!googleResponse.ok) {
      // If Google says our refresh token is invalid, remove it from our cookie
      if (tokens.error === 'invalid_grant') {
        const response = NextResponse.json(
          { error: tokens.error, message: tokens.error_description || 'Failed to refresh token' },
          { status: 400 }
        );
        response.cookies.delete('mm_refresh');
        return response;
      }
      
      return NextResponse.json(
        { error: tokens.error, message: tokens.error_description || 'Failed to refresh token' },
        { status: 400 }
      );
    }

    // Send back just the new access token and when it expires
    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in
    });

  } catch (error) {
    // If anything goes wrong, send back an error
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error during token refresh' },
      { status: 500 }
    );
  }
}