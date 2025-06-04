/**
 * Enhanced Security Middleware for MailMop
 * 
 * This middleware provides comprehensive security protection including:
 * - Authentication enforcement for protected routes
 * - Rate limiting to prevent abuse
 * - Security headers (HSTS, CSP, etc.)
 * - Request validation and attack prevention
 * - Production-safe logging
 */

import { createBrowserClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/utils/logger'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const DASHBOARD_RATE_LIMIT = 100; // requests per window for dashboard

// In-memory rate limit store (resets on server restart)
// For production scaling, consider Redis or Upstash
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get the client's IP address for rate limiting
 */
function getClientIP(req: NextRequest): string {
  // Try various headers for the real IP (Vercel sets these)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfIP = req.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || cfIP || req.headers.get('x-vercel-forwarded-for') || 'unknown';
}

/**
 * Check if a request should be rate limited
 */
function checkRateLimit(req: NextRequest, limit: number): boolean {
  const ip = getClientIP(req);
  const key = `middleware_rate_limit_${ip}`;
  const now = Date.now();
  
  const record = rateLimitStore.get(key) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  // Reset if window has passed
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  
  return record.count > limit;
}

/**
 * Add comprehensive security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Enforce HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy - restrictive but allows necessary resources
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.supabase.co https://*.supabase.co https://www.googleapis.com https://accounts.google.com https://api.stripe.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Validate and sanitize request to prevent attacks
 */
function validateRequest(req: NextRequest): { valid: boolean; reason?: string } {
  const url = req.nextUrl.pathname;
  const userAgent = req.headers.get('user-agent') || '';
  
  // Block requests with suspicious patterns
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i,   // JavaScript URLs
    /vbscript:/i,     // VBScript URLs
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      return { valid: false, reason: 'Suspicious request pattern detected' };
    }
  }
  
  // Block requests with excessive length
  if (url.length > 2048) {
    return { valid: false, reason: 'URL too long' };
  }
  
  if (userAgent.length > 1000) {
    return { valid: false, reason: 'User agent too long' };
  }
  
  return { valid: true };
}

/**
 * Check if user is authenticated using Supabase session
 */
async function checkAuthentication(req: NextRequest): Promise<{ authenticated: boolean; user?: any }> {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set() {
            // Not needed in middleware; safely no-op
          },
          remove() {
            // Not needed in middleware; safely no-op
          }
        }
      }
    )

    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      logger.middleware.warn('Authentication check failed', { 
        error: error.message,
        url: req.nextUrl.pathname 
      });
      return { authenticated: false };
    }
    
    return { 
      authenticated: !!session, 
      user: session?.user 
    };
  } catch (error) {
    logger.middleware.error('Authentication error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.nextUrl.pathname 
    });
    return { authenticated: false };
  }
}

export async function middleware(req: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIP(req);
  const url = req.nextUrl.pathname;
  
  try {
    // 1. Validate request to prevent attacks
    const validation = validateRequest(req);
    if (!validation.valid) {
      logger.security.warn('Malicious request blocked', {
        ip,
        url,
        userAgent: req.headers.get('user-agent') ?? undefined,
        reason: validation.reason
      });
      
      return new NextResponse('Bad Request', { status: 400 });
    }
    
    // 2. Apply rate limiting for dashboard routes
    if (url.startsWith('/dashboard')) {
      if (checkRateLimit(req, DASHBOARD_RATE_LIMIT)) {
        logger.security.warn('Rate limit exceeded', {
          ip,
          url,
          limit: DASHBOARD_RATE_LIMIT
        });
        
        return new NextResponse('Rate limit exceeded', { status: 429 });
      }
    }
    
    // 3. Check authentication for protected routes
    if (url.startsWith('/dashboard')) {
      const auth = await checkAuthentication(req);
      
      if (!auth.authenticated) {
        logger.middleware.info('Unauthenticated access attempt to dashboard', {
          ip,
          url,
          userAgent: req.headers.get('user-agent') || undefined
        });
        
        // Redirect to home page for unauthenticated users
        return NextResponse.redirect(new URL('/', req.url));
      }
      
      // Log successful authentication (debug level for production filtering)
      logger.middleware.debug('Authenticated dashboard access', {
        userId: auth.user?.id,
        email: auth.user?.email,
        url
      });
    }
    
    // 4. Create response and add security headers
    const response = NextResponse.next();
    const secureResponse = addSecurityHeaders(response);
    
    // 5. Log request completion (debug level)
    const duration = Date.now() - startTime;
    logger.middleware.debug('Request processed', {
      url,
      method: req.method,
      duration,
      ip,
      status: 200
    });
    
    return secureResponse;
    
  } catch (error) {
    // Log security-related errors
    logger.security.error('Middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url,
      ip,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const config = {
  matcher: [
    // Match all routes except:
    // - API routes (they have their own security)
    // - Static files (_next/static)
    // - Image optimization (_next/image)
    // - Favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
