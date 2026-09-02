import Link from 'next/link'

/**
 * Visible author block. Google weights first-hand experience and a named,
 * verifiable author; "MailMop Team" as an Organization gives it nothing to
 * work with. MailMop is a solo project, so every post is by the founder.
 */
export const AUTHOR = {
  name: 'Neil Bhammar',
  role: 'Founder of MailMop',
  url: 'https://github.com/neilbhammar',
  sameAs: ['https://github.com/neilbhammar', 'https://github.com/neilbhammar/mailmop'],
}

export function AuthorBio() {
  return (
    <aside className="mt-12 p-6 rounded-xl border border-border/80 bg-card/60 max-w-4xl" aria-label="About the author">
      <p className="text-sm text-muted-foreground mb-1">Written by</p>
      <p className="font-semibold text-foreground">
        <a href={AUTHOR.url} rel="author noopener noreferrer" target="_blank" className="hover:text-primary">
          {AUTHOR.name}
        </a>
        <span className="text-muted-foreground font-normal"> · {AUTHOR.role}</span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Neil built MailMop to clean out his own Gmail without handing his email to a third-party
        server. It runs in your browser, the{' '}
        <a href="https://github.com/neilbhammar/mailmop" rel="noopener noreferrer" target="_blank" className="text-primary hover:underline">
          code is open source
        </a>
        , and it passed Google&apos;s CASA security assessment. Everything in these guides comes from
        cleaning real inboxes, including the data in the{' '}
        <Link href="/blog/state-of-the-inbox-2026" className="text-primary hover:underline">
          State of the Inbox report
        </Link>
        .
      </p>
    </aside>
  )
}
