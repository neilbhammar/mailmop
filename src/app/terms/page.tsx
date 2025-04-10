'use client';

import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center text-blue-600 hover:underline mb-6"
      >
        ← Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <p className="mb-4 text-gray-700">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
        <p className="mb-3">
          By accessing or using MailMop, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
        <p className="mb-3">
          MailMop is a privacy-preserving Gmail analysis tool that helps users identify bulk senders, take action on unwanted emails, and declutter their inboxes. The service operates primarily client-side and provides metadata-only analysis of Gmail accounts.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Privacy and Data Usage</h2>
        <p className="mb-3">
          MailMop is designed with privacy as a core principle. Our collection and use of data is governed by our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms of Service.
        </p>
        <p className="mb-3">
          We do not store or process the content of your emails. All email analysis occurs directly in your browser, and sensitive data is not transmitted to our servers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. User Accounts</h2>
        <p className="mb-3">
          To use MailMop, you must authenticate with a Google account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Limitations and Beta Status</h2>
        <p className="mb-3">
          MailMop may be in beta status, which means features may be limited and access may be restricted to whitelisted users. We make no guarantees about stability, availability, or functionality during beta periods.
        </p>
        <p className="mb-3">
          MailMop operates within the constraints of the Gmail API. As such, it is subject to Gmail's rate limits, service availability, and any changes Google may make to their API.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Source Availability and Licensing</h2>
        <p className="mb-3">
          MailMop's source code is available for inspection on GitHub. However, it is provided under a license that does not permit commercial use or redistribution without explicit permission.
        </p>
        <p className="mb-3">
          You may view and fork the source code, but you may not use it to create competing commercial services or distribute it as your own product.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
        <p className="mb-3">
          MailMop is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the service will be error-free or uninterrupted. We are not responsible for any actions you take based on the information provided by our service.
        </p>
        <p className="mb-3">
          In no event shall MailMop, its operators, or contributors be liable for any direct, indirect, incidental, special, or consequential damages arising out of the use or inability to use the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Modifications to Service and Terms</h2>
        <p className="mb-3">
          We reserve the right to modify or discontinue MailMop temporarily or permanently at any time without notice. We may also update these Terms of Service at any time. Your continued use of the service after any changes constitutes acceptance of those changes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
        <p className="mb-3">
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which MailMop operates, without regard to its conflict of law provisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
        <p className="mb-3">
          If you have any questions about these Terms, please contact us.
        </p>
      </section>
    </div>
  );
} 