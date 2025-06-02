import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure your Supabase URL and Service Role Key are set in environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * API route to handle downgrading a user's plan to 'free',
 * typically when their Pro plan expires.
 * This version expects an Authorization: Bearer <token> header.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[API/Downgrade] Missing or invalid Authorization header.');
      return NextResponse.json({ error: 'User not authenticated: Missing token' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Create a Supabase admin client (uses service role key)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('[API/Downgrade] Error getting user from token:', userError?.message || 'No user found');
      return NextResponse.json({ error: 'User not authenticated: Invalid token' }, { status: 401 });
    }

    const userId = user.id;

    // Update the user's profile to free plan and nullify expiration date
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: 'free',
        plan_expires_at: null,
        plan_updated_at: new Date().toISOString(), // Keep track of when the plan was last updated
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[API/Downgrade] Error updating profile for downgrade:', updateError);
      return NextResponse.json({ error: 'Failed to downgrade user plan' }, { status: 500 });
    }

    console.log(`[API/Downgrade] User ${userId} successfully downgraded to Free plan.`);
    return NextResponse.json({ message: 'User downgraded to Free successfully' }, { status: 200 });

  } catch (error) {
    console.error('[API/Downgrade] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

// Optional: GET handler for health check
export async function GET() {
  return NextResponse.json({ message: 'Downgrade API is active. Use POST to downgrade.' }, { status: 200 });
} 