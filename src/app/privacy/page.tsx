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

          <section>
            <h2>Our Privacy-First Approach</h2>
            <p>
              MailMop is designed with privacy at its core. We believe your email data belongs to you, which is why our app operates primarily on your device rather than our servers.
            </p>
            <p>
              <strong>Local-First Processing:</strong> All email analysis happens directly in your browser. Your emails and their contents never leave your device or pass through our servers.
            </p>
            <p>
              <strong>No Email Content Storage:</strong> We don't store, process, or have access to the contents of your emails. The app only accesses email metadata (such as sender information and unsubscribe links) to provide its functionality. We are committed to ensuring your email content remains private and under your control.
            </p>
          </section>

          <section>
            <h2>Gmail API Access</h2>
            <p>
              MailMop uses the Gmail API with limited, specific scopes to help analyze your inbox. We request only the minimum permissions necessary for the app to function:
            </p>
            <ul>
              <li>Reading email metadata (like sender, subject, date - not the email body).</li>
              <li>Modifying emails when you instruct the app to (e.g., deleting emails, marking as read, applying labels).</li>
            </ul>
            <p>
              Your Gmail authentication tokens (access and refresh tokens) are stored securely in your browser's local storage. They are never transmitted to or stored on our servers. This means you retain full control over MailMop's access to your Gmail account, and you can revoke this access at any time through your Google Account settings or directly within MailMop.
            </p>
          </section>

          <section>
            <h2>What Data Our Hosted Version Stores</h2>
            <p>
              While MailMop is designed to be client-first, the hosted version of our service (app.mailmop.com) stores a minimal amount of data on our secure servers to provide and improve the service. This includes:
            </p>
            <ul>
              <li>
                <strong>User Account Information:</strong> When you sign up, we store your email address and a unique user ID provided by Google. This is used to identify your account.
              </li>
              <li>
                <strong>User-Submitted Feedback:</strong> If you choose to send us feedback through the app or other channels, we will store the content of your feedback to help us understand issues and improve MailMop.
              </li>
              <li>
                <strong>High-Level Analytics Logs:</strong> To understand how MailMop is used and to identify areas for improvement, we log certain actions taken within the application. This is high-level, aggregated data. For example, we might log that a user (identified by a non-personally-identifiable ID) used the "bulk delete" feature at a certain time, or that an analysis was started.
                <br />
                <strong>Crucially, these logs do not contain any of your email content, sender details from your inbox, subject lines, or any other sensitive information from your Gmail account.</strong> They are purely for understanding feature popularity and application performance.
              </li>
              <li>
                <strong>Beta Program Status:</strong> If you are part of a beta program, we store information regarding your participation status.
              </li>
              <li>
                <strong>Subscription and Plan Information:</strong> If MailMop offers paid plans, we will store information related to your subscription status, plan type, and billing cycle (managed through a secure third-party payment processor).
              </li>
            </ul>
            <p>
              We want to reiterate: <strong>we never store your email content, lists of senders from your inbox, or detailed analysis results on our servers.</strong> All such processing and data handling for your inbox analysis remain client-side.
            </p>
          </section>

          <section>
            <h2>Data Sharing</h2>
            <p>
              We do not sell or rent your personal information to third parties. We may share data in the following limited circumstances:
            </p>
            <ul>
                <li><strong>With Service Providers:</strong> We may use third-party service providers for functions like hosting, analytics (as described above, e.g., Supabase for our database and Vercel for hosting and analytics), and customer support. These providers only have access to the information necessary to perform their functions and are contractually obligated to protect your data.</li>
                <li><strong>For Legal Reasons:</strong> We may disclose your information if required by law, subpoena, or other legal process, or if we have a good faith belief that disclosure is reasonably necessary to (a) investigate, prevent, or take action regarding suspected or actual illegal activities or to assist government enforcement agencies; (b) enforce our agreements with you; (c) investigate and defend ourselves against any third-party claims or allegations; (d) protect the security or integrity of our Service; or (e) exercise or protect the rights and safety of MailMop, our users, personnel, or others.</li>
            </ul>
          </section>
          
          <section>
            <h2>Data Security</h2>
            <p>
                We implement industry-standard security measures to protect the minimal data we store on our servers. This includes encryption in transit (HTTPS) and at rest, access controls, and regular security assessments. However, no method of transmission over the Internet or method of electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2>Your Data Rights</h2>
            <p>
                Depending on your location, you may have certain rights regarding your personal data, including the right to access, correct, or delete your data. You can manage your account information and data directly through MailMop or by contacting us. To delete your account and associated data stored on our servers, please contact us. Note that deleting your account with MailMop does not affect your Gmail account or data stored within Gmail.
            </p>
          </section>

          <section>
            <h2>Source Availability</h2>
            <p>
              MailMop is source-available, meaning you can inspect our code to verify our privacy claims. The source code is available on GitHub.
            </p>
            <p>
              <a 
                href="https://github.com/neilbhammar/mailmop" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View MailMop Source Code on GitHub
              </a>
            </p>
          </section>
          
          <section>
            <h2>Changes to This Policy</h2>
            <p>
                We may update this Privacy Policy from time to time. If we make material changes, we will notify you by updating the date at the top of this policy and, in some cases, we may provide more prominent notice (such as by adding a statement to our homepage or sending you a notification). We encourage you to review this Privacy Policy periodically to stay informed about our practices.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our privacy practices, please contact us at [Your Contact Email Address or Link to Contact Form].
            </p>
          </section>
        </article>
      </div>
    </div>
  );
} 