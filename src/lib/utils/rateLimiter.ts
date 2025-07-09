// Simple in-memory rate limiter for API routes
// Tracks requests per IP address with sliding window approach

interface RateLimit {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory (resets on server restart)
const rateStore = new Map<string, RateLimit>();

// Clean up old entries every 15 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateStore.entries()) {
    if (now > limit.resetTime) {
      rateStore.delete(key);
    }
  }
}, 15 * 60 * 1000);

/**
 * Rate limiter options
 */
export interface RateLimiterConfig {
  /** Maximum requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom identifier (defaults to IP address) */
  identifier?: string;
}

/**
 * Check if a request should be rate limited
 * @param request - The Next.js request object
 * @param config - Rate limiter configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  request: Request | { headers: Headers },
  config: RateLimiterConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const resetTime = now + config.windowMs;
  
  // Get identifier (IP address or custom identifier)
  let identifier = config.identifier;
  if (!identifier) {
    // Try to get real IP from various headers (for proxies, CDNs)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    identifier = cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown';
  }

  const key = `${identifier}:${config.maxRequests}:${config.windowMs}`;
  const current = rateStore.get(key);

  // If no entry exists or time window has passed, reset
  if (!current || now > current.resetTime) {
    rateStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  // If under the limit, increment and allow
  if (current.count < config.maxRequests) {
    current.count++;
    return { allowed: true, remaining: config.maxRequests - current.count, resetTime: current.resetTime };
  }

  // Over the limit, deny request
  return { allowed: false, remaining: 0, resetTime: current.resetTime };
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
  // Strict limits for auth endpoints (to prevent brute force)
  AUTH: { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
  
  // Moderate limits for user actions (to prevent abuse)
  USER_ACTION: { maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  
  // Looser limits for general API usage
  GENERAL: { maxRequests: 200, windowMs: 15 * 60 * 1000 }, // 200 requests per 15 minutes
  
  // Strict limits for webhooks (external)
  WEBHOOK: { maxRequests: 1000, windowMs: 15 * 60 * 1000 }, // 1000 requests per 15 minutes
} as const;

/**
 * Helper function to create a rate limited response
 */
export function createRateLimitResponse(resetTime: number): Response {
  const resetInSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({ 
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
      retryAfter: resetInSeconds
    }),
    { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': resetInSeconds.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    }
  );
} 