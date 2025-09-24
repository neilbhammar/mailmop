'use client'

import { AuthProvider } from '@/context/AuthProvider'
import { GmailPermissionsProvider } from '@/context/GmailPermissionsProvider'
import { AnalysisProvider } from '@/context/AnalysisProvider'
import { QueueProvider } from '@/context/QueueProvider'
import { CrispProvider } from '@/components/crisp/CrispProvider'
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
        <CrispProvider>
          <GmailPermissionsProvider>
            <AnalysisProvider>
              <QueueProvider>
                {children}
              </QueueProvider>
            </AnalysisProvider>
          </GmailPermissionsProvider>
        </CrispProvider>
      </AuthProvider>
      <Toaster richColors closeButton />
    </ThemeProvider>
  )
} 