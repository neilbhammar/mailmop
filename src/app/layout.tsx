// src/app/layout.tsx
import './globals.css'
import { AuthProvider } from '@/context/AuthProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
