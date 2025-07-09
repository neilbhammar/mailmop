import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/utils/rateLimiter';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
});

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    // SECURITY: Apply rate limiting to prevent checkout redirect abuse
    const rateLimit = checkRateLimit(request, RATE_LIMITS.GENERAL);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const params = await context.params;
    const session = await stripe.checkout.sessions.retrieve(params.sessionId);
    
    if (!session?.url) {
      throw new Error('No checkout URL found');
    }

    return Response.redirect(session.url);
  } catch (err) {
    console.error('Error redirecting to checkout:', err);
    return new Response('Error redirecting to checkout', { status: 500 });
  }
} 