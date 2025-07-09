import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

export async function GET(request: Request) {
  // SECURITY: Apply rate limiting to prevent abuse
  const rateLimit = checkRateLimit(request, RATE_LIMITS.GENERAL);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetTime);
  }

  // Simply check if the refresh token cookie exists
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('mm_refresh');
  
  const responseBody = { hasRefreshToken: !!refreshToken };
  
  // Create a NextResponse to be able to set headers
  const response = NextResponse.json(responseBody);

  // Add Cache-Control header
  // - public: Allows shared caches (like Vercel's Edge CDN) to store the response.
  // - s-maxage=300: Tells the CDN to cache the response for 300 seconds (5 minutes).
  // - stale-while-revalidate=600: If a request comes after 300s but before 300+600s (total 15 mins),
  //   Vercel's Edge can serve the stale (cached) content immediately while
  //   revalidating the content in the background (calling the function once).
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  
  // - Vary: Cookie: This is crucial. It tells the cache that the response
  //   can vary based on the content of the Cookie header sent by the client.
  //   So, a user with the 'mm_refresh' cookie will have a different cache entry
  //   than a user without it.
  response.headers.set('Vary', 'Cookie');

  return response;
} 