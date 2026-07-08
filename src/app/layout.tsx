// src/app/layout.tsx
import './globals.css'
import { Nunito } from 'next/font/google'
import { ClientProviders } from './client-providers'
import type { Metadata, Viewport } from 'next'

// Initialize Nunito font
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})

// Explicit viewport config for mobile: proper scaling on phones, and
// viewport-fit=cover lets the app extend into the safe area on notched iPhones.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

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
  metadataBase: new URL('https://mailmop.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'MailMop - Clean Your Gmail Inbox in Minutes',
    description: 'MailMop helps you declutter your Gmail inbox by analyzing thousands of emails and organizing them by sender. Delete unwanted emails in bulk, unsubscribe from newsletters, and reclaim your inbox in minutes.',
    url: 'https://mailmop.com',
    siteName: 'MailMop',
    images: [
      {
        url: '/social-share.png?v=2',
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
    images: ['/social-share.png?v=2'],
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
}

// Site-wide structured data: helps Google rich results AND gives LLM crawlers
// (ChatGPT, Perplexity, Claude) a clean, factual description of what MailMop is.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://mailmop.com/#organization',
      name: 'MailMop',
      url: 'https://mailmop.com',
      logo: 'https://mailmop.com/logo10.png',
      description: 'MailMop is a privacy-first Gmail cleanup tool that analyzes your inbox by sender so you can bulk delete, unsubscribe, and reclaim storage in minutes.',
      sameAs: ['https://twitter.com/mailmop'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://mailmop.com/#website',
      url: 'https://mailmop.com',
      name: 'MailMop',
      publisher: { '@id': 'https://mailmop.com/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'MailMop',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://mailmop.com',
      description: 'Clean your Gmail inbox in minutes. MailMop groups thousands of emails by sender so you can bulk delete, unsubscribe from newsletters, block senders, and free up Google storage. Your email data never leaves your browser.',
      featureList: [
        'Analyze your entire Gmail inbox grouped by sender',
        'Bulk delete unwanted emails',
        'One-click unsubscribe from newsletters',
        'Block senders and create filters',
        'Free up Gmail / Google storage',
        'Privacy-first: email data is processed in your browser',
      ],
      offers: [
        { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
        { '@type': 'Offer', price: '22.68', priceCurrency: 'USD', name: 'Pro (billed annually)' },
      ],
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.className}>
      <head>
        <link rel="icon" href="/favicon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
