// src/app/layout.tsx
'use client'

import './globals.css'
import { Inter, Nunito } from 'next/font/google'
import { AuthProvider } from '@/context/AuthProvider'
import { GmailPermissionsProvider } from '@/context/GmailPermissionsProvider'
import { AnalysisProvider } from '@/context/AnalysisProvider'
import { QueueProvider } from '@/context/QueueProvider'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

// Initialize Nunito font
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.className}>
      <head>
        <title>MailMop</title>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
        <AuthProvider>
          <GmailPermissionsProvider>
            <AnalysisProvider>
              <QueueProvider>
              {children}
              </QueueProvider>
            </AnalysisProvider>
          </GmailPermissionsProvider>
        </AuthProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
