import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';

// Ensure your Supabase URL and Service Role Key are set in environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * API route to handle upgrading a user's plan after successful Stripe checkout.
 * This route should be called when the user is redirected back to the application
 * with a success indicator from Stripe (e.g., /dashboard?checkout=success).
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    // Create a Supabase client with the service role key for admin tasks AND token validation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    // Create a Supabase client for the route handler for cookie-based session fallback
    const supabaseUserClient = createRouteHandlerClient({ cookies: () => cookieStore });

    let userId: string | undefined;
    let authSource: string = 'unknown';

    // 1. Try to authenticate via Bearer token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer '
      console.log('[API/Upgrade] Attempting authentication with Bearer token.');
      const { data: { user: userFromToken }, error: tokenError } = await supabaseAdmin.auth.getUser(token);

      if (tokenError) {
        console.warn('[API/Upgrade] Bearer token validation error:', tokenError.message, 'Falling back to cookie auth.');
        // Do not return yet, fall through to cookie authentication
      } else if (userFromToken) {
        userId = userFromToken.id;
        authSource = 'token';
        console.log(`[API/Upgrade] Authenticated user ${userId} via Bearer token.`);
      }
    }

    // 2. If token authentication was not attempted or failed, try cookie-based session
    if (!userId) {
      console.log('[API/Upgrade] Attempting authentication with cookie session.');
    const { data: { session }, error: sessionError } = await supabaseUserClient.auth.getSession();

    if (sessionError) {
        console.error('[API/Upgrade] Error getting session (cookie):', sessionError);
        // If token auth also failed or wasn't attempted, this is a hard fail.
      return NextResponse.json({ error: 'Failed to get user session' }, { status: 500 });
    }
      if (session?.user) {
        userId = session.user.id;
        authSource = 'cookie';
        console.log(`[API/Upgrade] Authenticated user ${userId} via cookie session.`);
      } 
    }

    // 3. If neither method authenticated the user, return 401
    if (!userId) {
      console.warn('[API/Upgrade] No user session found via token or cookie.');
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log(`[API/Upgrade] Proceeding with upgrade for user ${userId} (authenticated via ${authSource}).`);

    // Fetch the user's current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan_expires_at')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for a new pro user
      console.error('[API/Upgrade] Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    let newExpiryDate;
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (profile?.plan_expires_at) {
      const currentExpiry = new Date(profile.plan_expires_at);
      // If current expiry is in the future, add 1 year to it
      if (currentExpiry > new Date()) {
        newExpiryDate = new Date(currentExpiry.setFullYear(currentExpiry.getFullYear() + 1));
      } else {
        // If current expiry is in the past, set to 1 year from now
        newExpiryDate = oneYearFromNow;
      }
    } else {
      // If no expiry date exists, set to 1 year from now
      newExpiryDate = oneYearFromNow;
    }

    // Update the user's profile with the new plan and expiration date
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: 'pro',
        plan_expires_at: newExpiryDate.toISOString(),
        plan_updated_at: new Date().toISOString(), // Keep track of when the plan was last updated
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[API/Upgrade] Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update user plan' }, { status: 500 });
    }

    console.log(`[API/Upgrade] User ${userId} successfully upgraded to Pro. Expiry: ${newExpiryDate.toISOString()}`);
    return NextResponse.json({ message: 'User upgraded to Pro successfully' }, { status: 200 });

  } catch (error) {
    console.error('[API/Upgrade] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

// Optional: GET handler for health check or testing, though POST is standard for actions.
export async function GET() {
  return NextResponse.json({ message: 'Upgrade API is active. Use POST to upgrade.' }, { status: 200 });
} 