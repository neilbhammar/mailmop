// src/app/layout.tsx
'use client'

import './globals.css'
import { AuthProvider } from '@/context/AuthProvider'
import { GmailPermissionsProvider } from '@/context/GmailPermissionsProvider'
import { AnalysisProvider } from '@/context/AnalysisProvider'
import { Toaster } from 'sonner'
import { Nunito } from 'next/font/google'

// Initialize Nunito font
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.className}>
      <head>
        <title>MailMop</title>
        <link rel="icon" href="/favicon.png" />
      </head>
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
