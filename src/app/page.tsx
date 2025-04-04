// src/app/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/supabase/client'

export default function Home() {
  const router = useRouter()

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/dashboard` }
    })
    if (error) console.error(error)
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-6">Welcome to MailMop</h1>
      <button onClick={signIn} className="bg-black text-white px-4 py-2 rounded">
        Sign in with Google
      </button>
    </main>
  )
}
