import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open MailMop in Your Browser - Required for Google Sign-In',
  description: 'For security reasons, Google sign-in requires opening MailMop in your full browser rather than an embedded app view. Click to open in Safari, Chrome, or your default browser.',
  robots: 'noindex', // Don't index this utility page
}

export default function OpenInBrowserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 