// src/app/layout.tsx
'use client'

import './globals.css'
import { AuthProvider } from '@/context/AuthProvider'
import { GmailPermissionsProvider } from '@/context/GmailPermissionsProvider'
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GmailPermissionsProvider>
            {children}
          </GmailPermissionsProvider>
        </AuthProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
