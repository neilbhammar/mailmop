import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * API endpoint to generate HMAC-SHA256 signatures for Crisp user verification
 * This ensures that user emails are cryptographically verified when they chat with support
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Invalid session or missing email' },
        { status: 401 }
      )
    }

    // Get the Crisp secret key from environment variables
    const crispSecretKey = process.env.CRISP_SECRET_KEY
    if (!crispSecretKey) {
      console.error('[Crisp] CRISP_SECRET_KEY environment variable not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Generate HMAC-SHA256 signature for the user's email
    const signature = crypto
      .createHmac('sha256', crispSecretKey)
      .update(user.email)
      .digest('hex')

    // Return the email and signature for frontend use
    return NextResponse.json({
      email: user.email,
      signature: signature
    })

  } catch (error) {
    console.error('[Crisp] Error generating email signature:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

