// src/app/layout.tsx
import './globals.css'
import { Nunito } from 'next/font/google'
import { ClientProviders } from './client-providers'
import type { Metadata } from 'next'

// Initialize Nunito font
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MailMop - Clean Your Gmail Inbox in Minutes',
  description: 'MailMop helps you declutter your Gmail inbox by analyzing thousands of emails and organizing them by sender. Delete unwanted emails in bulk, unsubscribe from newsletters, and reclaim your inbox in minutes.',
  keywords: ['Gmail', 'email management', 'inbox cleanup', 'email organization', 'unsubscribe', 'bulk delete'],
  authors: [{ name: 'MailMop Team' }],
  creator: 'MailMop',
  publisher: 'MailMop',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://www.mailmop.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'MailMop - Clean Your Gmail Inbox in Minutes',
    description: 'MailMop helps you declutter your Gmail inbox by analyzing thousands of emails and organizing them by sender. Delete unwanted emails in bulk, unsubscribe from newsletters, and reclaim your inbox in minutes.',
    url: 'https://www.mailmop.com',
    siteName: 'MailMop',
    images: [
      {
        url: '/social-share.png',
        width: 1200,
        height: 630,
        alt: 'MailMop - Gmail Inbox Cleanup Tool',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MailMop - Clean Your Gmail Inbox in Minutes',
    description: 'MailMop helps you declutter your Gmail inbox by analyzing thousands of emails and organizing them by sender. Delete unwanted emails in bulk, unsubscribe from newsletters, and reclaim your inbox in minutes.',
    images: ['/social-share.png'],
    creator: '@mailmop',
    site: '@mailmop',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification-code', // You can add this later
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.className}>
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
