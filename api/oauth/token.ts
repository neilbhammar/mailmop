import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, redirect_uri } = request.body;
    
    console.log('Received token exchange request:', { code: code?.substring(0, 10) + '...', redirect_uri });

    if (!code) {
      return response.status(400).json({ error: 'Missing code parameter' });
    }

    // Log environment variables (without exposing secrets)
    console.log('Environment check:', { 
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri,
        grant_type: 'authorization_code',
      }).toString()
    });

    const responseText = await tokenResponse.text();
    
    try {
      // Try to parse as JSON
      const data = JSON.parse(responseText);
      
      if (!tokenResponse.ok) {
        console.error('Token exchange error:', data);
        return response.status(tokenResponse.status).json(data);
      }
      
      console.log('Token exchange successful');
      return response.status(200).json(data);
    } catch (e) {
      // If not valid JSON, return as text
      console.error('Failed to parse token response:', responseText);
      return response.status(500).json({ 
        error: 'Invalid response from Google', 
        details: responseText.substring(0, 200) + '...' 
      });
    }
  } catch (error) {
    console.error('Token exchange error:', error);
    return response.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 