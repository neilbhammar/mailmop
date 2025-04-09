// src/app/layout.tsx
'use client'

import './globals.css'
import { AuthProvider } from '@/context/AuthProvider'
import { GmailPermissionsProvider } from '@/context/GmailPermissionsProvider'
import { AnalysisProvider } from '@/context/AnalysisProvider'
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GmailPermissionsProvider>
            <AnalysisProvider>
              {children}
            </AnalysisProvider>
          </GmailPermissionsProvider>
        </AuthProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
