// This file handles exchanging the authorization code we get from Google for access and refresh tokens
// Think of it like trading in a ticket (auth code) for both a temporary pass (access token) and a special renewal pass (refresh token)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This tells Next.js this is an Edge API Route - it runs on Vercel's edge network (super fast servers close to users)
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization code and redirect URI from the request body
    const { code, redirectUri } = await request.json();
    
    // If there's no code, we can't do the exchange
    if (!code) {
      return NextResponse.json(
        { error: 'no_code', message: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // Set up the data we need to send to Google
    // This is like filling out a form with all the required information
    const tokenData = new URLSearchParams({
      code: code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,            // Use the same redirectUri that Google saw
      grant_type: 'authorization_code',
    });

    // Make the request to Google's token endpoint
    // This is where we actually trade our authorization code for tokens
    const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenData.toString(),
    });

    // Get the response from Google
    const tokens = await googleResponse.json();

    // If something went wrong with getting the tokens
    if (!googleResponse.ok) {
      return NextResponse.json(
        { error: 'token_error', message: tokens.error_description || 'Failed to exchange code' },
        { status: 400 }
      );
    }

    // Create a response object with the access token
    const response = NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in
    });

    // Add the refresh token as a secure cookie
    // This is like storing the renewal pass in a super secure vault
    response.cookies.set('mm_refresh', tokens.refresh_token, {
      httpOnly: true,          // Makes it so JavaScript can't read the cookie (more secure)
      secure: true,            // Only sends cookie over HTTPS
      sameSite: 'lax',        // Provides some protection against cross-site request forgery
      path: '/',              // Cookie is available everywhere on our site
      maxAge: 60 * 60 * 24 * 180 // Cookie lasts for 180 days
    });

    return response;

  } catch (error) {
    // If anything goes wrong, send back an error
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error during token exchange' },
      { status: 500 }
    );
  }
}