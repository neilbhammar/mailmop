import { redirect } from 'next/navigation';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
});

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
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