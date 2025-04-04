// src/app/layout.tsx
'use client'

import './globals.css'
import { AuthProvider } from '@/context/AuthProvider'
import { GmailPermissionsProvider } from '@/context/GmailPermissionsProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GmailPermissionsProvider>
            {children}
          </GmailPermissionsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
