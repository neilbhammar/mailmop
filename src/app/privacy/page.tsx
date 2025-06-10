'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <article className="prose prose-slate max-w-none dark:prose-invert prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6 prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4 prose-p:text-gray-700 prose-p:dark:text-slate-300 prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4 prose-ul:space-y-2 prose-a:text-blue-600 prose-a:dark:text-blue-400 hover:prose-a:text-blue-700 hover:prose-a:dark:text-blue-300">
          <h1>Privacy Policy</h1>
          
          <p>
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 my-6">
            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🔒 Privacy First Promise</p>
            <p className="text-blue-700 dark:text-blue-300 mb-0">
              <strong>Your emails are processed locally in your browser.</strong> While we access email content to find working unsubscribe links, 
              all processing happens on your device and no email content is sent to our servers.
            </p>
          </div>

          <section>
            <h2>Our Privacy-First Approach</h2>
            <p>
              MailMop is designed with privacy at its core. We believe your email data belongs to you, which is why our app operates primarily on your device rather than our servers.
            </p>
            <p>
              <strong>Local-First Processing:</strong> All email analysis and content processing happens directly in your browser. Your emails and their contents never leave your device or pass through our servers.
            </p>
            <p>
              <strong>What We Access:</strong> MailMop accesses email headers (sender, date, subject) for analysis and email content when finding fresh unsubscribe links. All processing is done locally on your device for your privacy and security.
            </p>
          </section>

          <section>
            <h2>📊 Exactly What Data We Collect on Our Backend</h2>
            <p>
              While your emails stay local, we do collect minimal data on our servers (Supabase) for essential functionality. Here's exactly what we store and why:
            </p>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg my-4">
              <h3 className="text-lg font-semibold mb-3">User Account Data</h3>
              <ul>
                <li><strong>Google Email Address:</strong> Used for account identification and login</li>
                <li><strong>Google User ID:</strong> Unique identifier from Google OAuth</li>
                <li><strong>Account Creation Date:</strong> When you first signed up</li>
                <li><strong>Last Login Date:</strong> For account security purposes</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>Why:</strong> Required for authentication and account management
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg my-4">
              <h3 className="text-lg font-semibold mb-3">Beta Access Management</h3>
              <ul>
                <li><strong>Beta Whitelist Status:</strong> Whether you have beta access</li>
                <li><strong>Waitlist Position:</strong> If you're on the waitlist</li>
                <li><strong>Access Granted Date:</strong> When beta access was provided</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>Why:</strong> To manage beta program access and notify users when ready
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg my-4">
              <h3 className="text-lg font-semibold mb-3">Action Analytics</h3>
              <ul>
                <li><strong>Action Type:</strong> "delete", "unsubscribe", "mark_read", "apply_label"</li>
                <li><strong>Action Count:</strong> How many emails were affected</li>
                <li><strong>Timestamp:</strong> When the action was performed</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>Why:</strong> To understand feature usage and improve the product
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                <strong>What we DON'T store:</strong> Email content, sender names, subject lines, or any personal information from your emails
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg my-4">
              <h3 className="text-lg font-semibold mb-3">Subscription Data (If Applicable)</h3>
              <ul>
                <li><strong>Stripe Customer ID:</strong> For billing management</li>
                <li><strong>Subscription Status:</strong> Active, inactive, cancelled</li>
                <li><strong>Plan Type:</strong> Free or premium</li>
                <li><strong>Billing Cycle:</strong> Monthly or annual</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>Why:</strong> To manage billing and provide appropriate access levels
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg my-4">
              <h3 className="text-lg font-semibold mb-3">Aggregated Usage Statistics</h3>
              <ul>
                <li><strong>Total Analysis Count:</strong> How many inbox analyses have been performed</li>
                <li><strong>Total Actions Count:</strong> How many email actions have been taken</li>
                <li><strong>Daily/Weekly Totals:</strong> Aggregated numbers for landing page stats</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>Why:</strong> To display usage statistics on our landing page and track product growth
              </p>
            </div>
          </section>

          <section>
            <h2>🚫 What We Absolutely DO NOT Collect</h2>
            <ul className="space-y-2">
              <li>❌ <strong>Email content or body text</strong></li>
              <li>❌ <strong>Email subject lines</strong></li>
              <li>❌ <strong>Sender names or email addresses from your inbox</strong></li>
              <li>❌ <strong>Recipient information</strong></li>
              <li>❌ <strong>Email attachments</strong></li>
              <li>❌ <strong>Detailed analysis results</strong></li>
              <li>❌ <strong>Your Gmail folder structure</strong></li>
              <li>❌ <strong>Contact lists or email histories</strong></li>
              <li>❌ <strong>Any personally identifiable information from your emails</strong></li>
            </ul>
          </section>

          <section>
            <h2>Gmail API Access</h2>
            <p>
              MailMop uses the Gmail API to analyze your inbox locally. We request full Gmail scope to enable advanced queries, but all processing happens in your browser:
            </p>
            <ul>
              <li><strong>Email Headers:</strong> Sender, date, subject, labels (processed locally only)</li>
              <li><strong>Email Content:</strong> HTML and text content to extract working unsubscribe links (processed locally only)</li>
              <li><strong>Email Actions:</strong> Delete, unsubscribe, mark as read, apply labels (when you request them)</li>
              <li><strong>Search Capabilities:</strong> Advanced filtering and bulk operations</li>
            </ul>
            <p>
              <strong>Your Gmail tokens</strong> (access and refresh tokens) are stored securely in httpOnly cookies and your browser's memory. They are never transmitted to or stored on our servers permanently.
            </p>
          </section>

          <section>
            <h2>Data Security & Infrastructure</h2>
            <p>
              The minimal data we do store is protected using industry-standard security:
            </p>
            <ul>
              <li><strong>Encryption:</strong> All data encrypted in transit (HTTPS) and at rest</li>
              <li><strong>Supabase:</strong> Our database provider with enterprise-grade security</li>
              <li><strong>Access Controls:</strong> Strict database access controls and authentication</li>
              <li><strong>Regular Security Audits:</strong> Ongoing security assessments and updates</li>
              <li><strong>Google CASA Assessment:</strong> Undergoing Google's security review process</li>
            </ul>
          </section>

          <section>
            <h2>Data Sharing & Third Parties</h2>
            <p>
              We do not sell, rent, or share your personal information with third parties, except:
            </p>
            <ul>
              <li><strong>Service Providers:</strong> Supabase (database), Vercel (hosting), Stripe (payments) - all with strict data protection agreements</li>
              <li><strong>Legal Requirements:</strong> Only if required by law or to protect our rights and users' safety</li>
              <li><strong>Business Transfers:</strong> In the unlikely event of a merger or acquisition, with the same privacy protections</li>
            </ul>
          </section>

          <section>
            <h2>Your Rights & Data Control</h2>
            <p>
              You have complete control over your data:
            </p>
            <ul>
              <li><strong>Access:</strong> View all data we store about you</li>
              <li><strong>Delete:</strong> Remove your account and all associated data</li>
              <li><strong>Revoke Access:</strong> Disconnect MailMop from your Google account anytime</li>
              <li><strong>Data Export:</strong> Request a copy of your stored data</li>
              <li><strong>Corrections:</strong> Update or correct your account information</li>
            </ul>
            <p>
              To exercise these rights, contact us through our support channels.
            </p>
          </section>

          <section>
            <h2>Source Code Transparency</h2>
            <p>
              MailMop is source-available, meaning you can inspect our code to verify our privacy claims:
            </p>
            <p>
              <a 
                href="https://github.com/neilbhammar/mailmop" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                🔍 View MailMop Source Code on GitHub
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we will notify you by updating the date at the top of this policy and, for significant changes, we'll provide more prominent notice through the app or email. Your continued use of MailMop after any changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>Contact & Questions</h2>
            <p>
              If you have any questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <ul>
              <li><strong>GitHub Issues:</strong> <a href="https://github.com/neilbhammar/mailmop/issues" target="_blank" rel="noopener noreferrer">Report privacy concerns</a></li>
              <li><strong>Website:</strong> <a href="https://mailmop.com" target="_blank" rel="noopener noreferrer">mailmop.com</a></li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
} 