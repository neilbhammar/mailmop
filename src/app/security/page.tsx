import Link from 'next/link'
import Script from 'next/script'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security & Privacy at MailMop | Gmail Cleanup That Stays in Your Browser',
  description:
    'How MailMop keeps your Gmail private: your inbox is analyzed in your browser, email contents never touch our servers, MailMop is open source, and it passed Google\'s CASA security assessment.',
  alternates: {
    canonical: 'https://mailmop.com/security',
  },
  openGraph: {
    title: 'Security & Privacy at MailMop',
    description:
      'Your inbox is analyzed in your browser, email contents never touch our servers, and MailMop is open source. Here is how MailMop protects your Gmail.',
    type: 'website',
    url: 'https://mailmop.com/security',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Security & Privacy at MailMop',
    description:
      'Your inbox is analyzed in your browser, email contents never touch our servers, and MailMop is open source.',
  },
}

const faqs = [
  {
    question: 'Does MailMop upload my emails to its servers?',
    answer:
      'No. MailMop runs in your browser and talks to Gmail directly from your device. Your email contents are never sent to or stored on MailMop\'s servers.',
  },
  {
    question: 'Why does MailMop ask for full Gmail access?',
    answer:
      'Permanently deleting email, blocking senders, and creating filters all require Gmail\'s full-access permission, so MailMop asks for it up front. That access is used from your own browser, only for the actions you choose.',
  },
  {
    question: 'Has MailMop been security audited?',
    answer:
      'Yes. MailMop passed Google\'s Cloud Application Security Assessment (CASA), the independent security review Google requires of apps that use restricted Gmail permissions.',
  },
  {
    question: 'Can I check what MailMop does with my data?',
    answer:
      'Yes. MailMop is open source. The code is on GitHub at github.com/neilbhammar/mailmop, so anyone can read exactly how it handles your inbox.',
  },
  {
    question: 'Does MailMop sell my data or show ads?',
    answer:
      'No. MailMop makes money from Pro subscriptions, not from your data. There are no ads and no data sales.',
  },
  {
    question: 'How do I remove MailMop\'s access to my Gmail?',
    answer:
      'Disconnect inside MailMop, or revoke access at any time in your Google Account under Security, then Third-party apps with account access.',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
}

const pillars = [
  {
    title: 'Your inbox is analyzed in your browser',
    body: 'MailMop connects your browser straight to Gmail. Sorting, counting, and grouping your mail by sender all happens on your own device. There is no MailMop server in the middle reading your email.',
  },
  {
    title: 'Email contents never touch our servers',
    body: 'Messages, subject lines, and attachments are not uploaded to MailMop. When MailMop reads an email to find a working unsubscribe link, that happens in your browser too.',
  },
  {
    title: 'Audited by Google\'s security program',
    body: 'Apps that ask for restricted Gmail permissions must pass Google\'s Cloud Application Security Assessment (CASA). MailMop passed it.',
  },
  {
    title: 'Open source, so you can check',
    body: 'Most inbox cleaners ask you to trust a black box. MailMop is open source on GitHub, so you, a security researcher, or a curious friend can check how it handles your data.',
  },
  {
    title: 'No ads. No selling data.',
    body: 'Some "free" inbox tools have paid for themselves by selling insights from your purchase receipts. MailMop is paid for by Pro subscriptions, so your inbox is never the product.',
  },
  {
    title: 'You stay in control',
    body: 'Nothing happens to your mail until you click. You can disconnect MailMop in one click, or revoke its access from your Google Account at any time.',
  },
]

export default function SecurityPage() {
  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen">
      <Script
        id="security-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to MailMop
          </Link>
        </div>

        <article className="prose prose-slate max-w-none dark:prose-invert prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6 prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-700 prose-p:dark:text-slate-300 prose-a:text-blue-600 prose-a:dark:text-blue-400">
          <h1>Security &amp; Privacy at MailMop</h1>

          <p className="text-lg">
            Cleaning up your inbox shouldn&apos;t mean handing it to a stranger. MailMop was built so you never have
            to: <strong>your Gmail is analyzed in your browser, and your email contents never touch our servers.</strong>
          </p>

          <div className="not-prose grid gap-4 sm:grid-cols-2 my-8">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">{p.title}</h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>

          <h2>How MailMop is different</h2>
          <p>
            Most inbox cleaners work by pulling your mail onto their own servers and processing it there. That copy
            can be kept, breached, subpoenaed, or quietly turned into a product. In 2017, Unroll.Me users learned
            that their e-receipts had been used to sell market research about Lyft to Uber.
          </p>
          <p>
            MailMop takes the opposite approach. Your browser does the work, Gmail stays the only place your email
            lives, and there&apos;s no server-side copy of your inbox to leak or sell.
          </p>

          <h2>The permissions MailMop asks for, and why</h2>
          <p>
            When you connect, Google will tell you MailMop wants full access to Gmail. Permanently deleting mail,
            blocking senders, and creating filters all require that permission, so we ask for it once instead of
            breaking cleanup into a dozen prompts. That access is used from your own browser, only for the
            actions you choose.
          </p>

          <h2>Verify it yourself</h2>
          <ul>
            <li>
              Read the code:{' '}
              <a href="https://github.com/neilbhammar/mailmop" target="_blank" rel="noopener noreferrer">
                github.com/neilbhammar/mailmop
              </a>
            </li>
            <li>
              Read the details in our <Link href="/privacy">privacy policy</Link>.
            </li>
            <li>
              Check or revoke MailMop&apos;s access any time in your{' '}
              <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">
                Google Account
              </a>
              .
            </li>
          </ul>

          <h2>Frequently asked questions</h2>
          {faqs.map((f) => (
            <div key={f.question}>
              <h3 className="text-base font-semibold">{f.question}</h3>
              <p>{f.answer}</p>
            </div>
          ))}

          <div className="not-prose mt-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-5">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Clean your inbox without giving it away.</p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Analyzing your inbox is free, with no credit card.
            </p>
            <Link
              href="/"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try MailMop free
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}
