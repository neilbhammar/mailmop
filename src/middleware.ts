// src/middleware.ts
import { createBrowserClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

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
  console.log('[middleware] session →', session)

  return res
}

export const config = {
  matcher: ['/dashboard'],
}
