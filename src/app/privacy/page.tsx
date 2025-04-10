'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center text-blue-600 hover:underline mb-6"
      >
        ← Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <p className="mb-4 text-gray-700">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Our Privacy-First Approach</h2>
        <p className="mb-3">
          MailMop is designed with privacy at its core. We believe your email data belongs to you, which is why our app operates primarily on your device rather than our servers.
        </p>
        <p className="mb-3">
          <strong>Local-First Processing:</strong> All email analysis happens directly in your browser. Your emails and their contents never leave your device or pass through our servers.
        </p>
        <p className="mb-3">
          <strong>No Email Content Storage:</strong> We don't store, process, or have access to the contents of your emails. The app only accesses email metadata (such as subject lines, sender information, and unsubscribe links) to provide its functionality.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Gmail API Access</h2>
        <p className="mb-3">
          MailMop uses the Gmail API with limited scopes to help analyze your inbox. We request only the minimum permissions needed:
        </p>
        <ul className="list-disc pl-6 mb-3 space-y-2">
          <li>Access to read email metadata (not content)</li>
          <li>Ability to help you unsubscribe from unwanted senders</li>
          <li>Permission to delete emails when you request it</li>
        </ul>
        <p className="mb-3">
          Your Gmail authentication tokens are stored securely in your browser's localStorage, not on our servers. This means you control access to your data at all times.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Data We Store</h2>
        <p className="mb-3">
          While most processing happens locally, we do store minimal information in our backend to provide essential functionality:
        </p>
        <ul className="list-disc pl-6 mb-3 space-y-2">
          <li><strong>User Profile:</strong> Basic account information including your email address and authentication details</li>
          <li><strong>Usage Analytics:</strong> Anonymized data about actions taken (analysis started, bulk actions performed) to improve the service</li>
          <li><strong>Beta Access Status:</strong> Information about whether your account is whitelisted for beta access</li>
          <li><strong>Subscription Status:</strong> If applicable, information about your subscription plan</li>
        </ul>
        <p className="mb-3">
          We never store email content, sender lists, or detailed analysis results on our servers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Data Sharing</h2>
        <p className="mb-3">
          We do not share your personal information with third parties except as necessary to provide the MailMop service (such as for authentication purposes).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Source Availability</h2>
        <p className="mb-3">
          MailMop is source-available, meaning you can inspect our code to verify our privacy claims. The source code is available on GitHub, though it is not licensed for commercial use.
        </p>
        <p className="mb-3">
          <a 
            href="https://github.com/neilbhammar/mailmop" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View MailMop Source Code
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
        <p className="mb-3">
          If you have any questions about our privacy practices, please contact us.
        </p>
      </section>
    </div>
  );
} 