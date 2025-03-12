import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, redirect_uri } = request.body;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.VITE_GOOGLE_CLIENT_ID!,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET!,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await tokenResponse.json();
    return response.status(tokenResponse.status).json(data);
  } catch (error) {
    console.error('Token exchange error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
} 