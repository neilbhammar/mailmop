'use client'

import { AuthProvider } from '@/context/AuthProvider'
import { GmailPermissionsProvider } from '@/context/GmailPermissionsProvider'
import { AnalysisProvider } from '@/context/AnalysisProvider'
import { QueueProvider } from '@/context/QueueProvider'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
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
  )
} 