import { headers } from 'next/headers'
import Stripe from 'stripe'
import { supabase } from '@/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
})

/**
 * API route to create a Stripe Checkout Session.
 * This is called from the client-side when the user wants to proceed to payment.
 * For existing subscribers, we extend their subscription instead of creating a new one.
 */
export async function POST(req: Request) {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    console.log('[Checkout] Creating session for user:', user.id);

    // Get user profile to check for existing subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, plan, plan_expires_at')
      .eq('user_id', user.id)
      .single()

    console.log('[Checkout] User profile:', {
      userId: user.id,
      plan: profile?.plan,
      hasSubscriptionId: !!profile?.stripe_subscription_id,
      expiresAt: profile?.plan_expires_at
    });

    // Create or retrieve customer
    let customer: Stripe.Customer
    
    if (profile?.stripe_customer_id) {
      try {
        customer = await stripe.customers.retrieve(profile.stripe_customer_id) as Stripe.Customer
        console.log('[Checkout] Retrieved existing customer:', customer.id);
      } catch (error) {
        console.log('[Checkout] Stored customer ID invalid, searching by email');
        // If stored customer ID is invalid, search by email
        const existingCustomers = await stripe.customers.list({
          email: user.email,
          limit: 1
        });
        
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
          console.log('[Checkout] Found existing customer by email:', customer.id);
          
          // Update profile with correct customer ID
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customer.id })
            .eq('user_id', user.id);
        } else {
          customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              supabase_user_id: user.id
            }
          });
          console.log('[Checkout] Created new customer:', customer.id);
        }
      }
    } else {
      // Check if customer already exists by email
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        console.log('[Checkout] Found existing customer by email:', customer.id);
        
        // Update profile with customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customer.id })
          .eq('user_id', user.id);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id
          }
        });
        console.log('[Checkout] Created new customer:', customer.id);
      }
    }

    // Check if user has an active Pro subscription (not expired)
    const hasActiveSubscription = profile?.stripe_subscription_id && 
                                  profile?.plan === 'pro' && 
                                  profile?.plan_expires_at &&
                                  new Date(profile.plan_expires_at) > new Date();
    
    console.log('[Checkout] Active subscription check:', {
      hasSubscriptionId: !!profile?.stripe_subscription_id,
      isPro: profile?.plan === 'pro',
      hasExpirationDate: !!profile?.plan_expires_at,
      isNotExpired: profile?.plan_expires_at ? new Date(profile.plan_expires_at) > new Date() : false,
      hasActiveSubscription
    });

    if (hasActiveSubscription) {
      console.log('[Checkout] User has active subscription, creating extension session');
      
      // For existing subscribers, create a one-time payment to extend their subscription
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        client_reference_id: user.id,
        payment_method_types: ['card'],
        mode: 'payment', // One-time payment mode
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'MailMop Pro - 1 Year Extension',
                description: 'Extend your MailMop Pro subscription by 365 days'
              },
              unit_amount: 2268, // $22.68 in cents
            },
            quantity: 1
          }
        ],
        allow_promotion_codes: true,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?canceled=true`,
        metadata: {
          supabase_user_id: user.id,
          type: 'subscription_extension',
          existing_subscription_id: profile.stripe_subscription_id
        }
      })

      console.log('[Checkout] Created extension session:', session.id);
      return new Response(JSON.stringify({ sessionId: session.id }))
    } else {
      console.log('[Checkout] Creating new subscription session for new/expired user');
      
      // Create regular subscription checkout session for new users or expired subscriptions
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        client_reference_id: user.id,
        payment_method_types: ['card'],
        mode: 'subscription',
      line_items: [
        {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1
          }
      ],
        allow_promotion_codes: true,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?canceled=true`,
        subscription_data: {
          metadata: {
            supabase_user_id: user.id
          }
        },
        metadata: {
          supabase_user_id: user.id,
          type: 'new_subscription'
        }
      })

      console.log('[Checkout] Created subscription session:', session.id);
      return new Response(JSON.stringify({ sessionId: session.id }))
    }
  } catch (err) {
    console.error('[Checkout] Error:', err)
    return new Response('Error creating checkout session', { status: 500 })
  }
}

// Optional: GET handler for health check or testing
export async function GET() {
  return new Response('Create Checkout Session API is active. Use POST to create a session.', { status: 200 })
} 