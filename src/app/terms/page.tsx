'use client';

import Link from 'next/link';

export default function TermsOfService() {
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

        <article className="prose prose-slate max-w-none dark:prose-invert prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6 prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4 prose-p:text-gray-700 prose-p:dark:text-slate-300 prose-p:mb-4 prose-a:text-blue-600 prose-a:dark:text-blue-400 hover:prose-a:text-blue-700 hover:prose-a:dark:text-blue-300">
          <h1>Terms of Service</h1>
          
          <p>
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 my-6">
            <p className="font-semibold text-red-800 dark:text-red-200 mb-2">⚠️ Important Notice</p>
            <p className="text-red-700 dark:text-red-300 mb-0">
              <strong>By using MailMop, you accept full responsibility and liability for all actions taken.</strong> 
              MailMop is provided "as-is" with no warranties. You use this service entirely at your own risk.
            </p>
          </div>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing, using, or creating an account with MailMop (the "Service"), you agree to be legally bound by these Terms of Service ("Terms"). If you do not agree to these terms in their entirety, you must not use our Service. Your use of the Service constitutes your acceptance of these Terms and any updates we may make to them.
            </p>
            <p>
              <strong>YOU ACKNOWLEDGE AND AGREE THAT YOU HAVE READ, UNDERSTOOD, AND ACCEPT ALL TERMS AND CONDITIONS SET FORTH HEREIN.</strong>
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              MailMop is a privacy-focused Gmail analysis and management tool that operates primarily in your browser. The Service helps users analyze their inbox, identify bulk senders, and perform email management actions.
            </p>
            <p>
              <strong>Service Status:</strong> MailMop has passed Google's CASA Security Verification Audit and is publicly available. The Service may still contain bugs, and functionality may change as we continue to improve the product.
            </p>
          </section>

          <section>
            <h2>3. User Responsibility and Assumption of Risk</h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-4 rounded-lg">
              <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">🛡️ Complete User Responsibility</p>
              <p>
                <strong>YOU ACCEPT FULL AND COMPLETE RESPONSIBILITY FOR ALL ACTIONS PERFORMED USING MAILMOP.</strong> This includes, but is not limited to:
              </p>
              <ul>
                <li>All email deletions, modifications, and bulk actions</li>
                <li>Any loss of important emails or data</li>
                <li>Unintended unsubscriptions or email modifications</li>
                <li>Any consequences of using automated email management features</li>
                <li>Any errors, bugs, or unexpected behavior in the Service</li>
                <li>Any security issues or data breaches (though we implement security measures)</li>
                <li>Any interruption of your email workflow or business operations</li>
              </ul>
            </div>
            <p>
              <strong>YOU ACKNOWLEDGE THAT EMAIL MANAGEMENT CARRIES INHERENT RISKS</strong> and that you are solely responsible for backing up important emails and exercising caution when using bulk action features.
            </p>
          </section>

          <section>
            <h2>4. Privacy and Data Usage</h2>
            <p>
              MailMop is designed with privacy as a core principle. Our collection and use of personal information is described in our <Link href="/privacy">Privacy Policy</Link>, which is incorporated by reference into these Terms.
            </p>
            <p>
              While we process your emails locally in your browser, <strong>YOU ACCEPT FULL RESPONSIBILITY FOR YOUR DECISION TO GRANT MAILMOP ACCESS TO YOUR GMAIL ACCOUNT.</strong>
            </p>
          </section>

          <section>
            <h2>5. User Accounts and Google Authentication</h2>
            <p>
              To use MailMop, you must authenticate with a Google account and grant necessary Gmail permissions. <strong>YOU ARE SOLELY RESPONSIBLE FOR:</strong>
            </p>
            <ul>
              <li>Maintaining the security of your Google account credentials</li>
              <li>All activities that occur under your account when using MailMop</li>
              <li>Monitoring and managing your Gmail API access permissions</li>
              <li>Revoking access if you no longer wish to use the Service</li>
            </ul>
          </section>

          <section>
            <h2>6. Service Availability and Beta Status</h2>
            <p>
              <strong>NO GUARANTEE OF SERVICE AVAILABILITY:</strong> We make no guarantees about the availability, reliability, functionality, or performance of MailMop. The Service may be:
            </p>
            <ul>
              <li>Interrupted, discontinued, or modified at any time without notice</li>
              <li>Subject to bugs, errors, or unexpected behavior</li>
              <li>Limited by Gmail API rate limits or Google's service availability</li>
              <li>Restricted to beta users or specific user groups</li>
            </ul>
            <p>
              <strong>YOU ACKNOWLEDGE THAT YOUR USE OF MAILMOP IS ENTIRELY AT YOUR OWN RISK AND DISCRETION.</strong>
            </p>
          </section>

          <section>
            <h2>7. Source Code and Licensing</h2>
            <p>
              MailMop's source code is available for inspection under our Source Available License. <strong>The availability of source code does not constitute any warranty or guarantee about the Service's security, functionality, or fitness for any purpose.</strong>
            </p>
            <p>
              <a 
                href="https://github.com/neilbhammar/mailmop" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View MailMop Source Code and License
              </a>
            </p>
          </section>

          <section>
            <h2>8. Prohibited Uses and User Conduct</h2>
            <p>
              You agree not to use the Service:
            </p>
            <ul>
              <li>For any unlawful purpose or in violation of any laws</li>
              <li>To harm, abuse, or violate the rights of others</li>
              <li>To create competing commercial services</li>
              <li>To reverse engineer, decompile, or attempt to extract source code</li>
              <li>To overload or interfere with our systems or the Gmail API</li>
            </ul>
            <p>
              <strong>VIOLATION OF THESE TERMS MAY RESULT IN IMMEDIATE TERMINATION OF YOUR ACCESS.</strong>
            </p>
          </section>

          <section>
            <h2>9. DISCLAIMER OF WARRANTIES</h2>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border-2 border-slate-300 dark:border-slate-600">
              <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">NO WARRANTIES WHATSOEVER</p>
              <p>
                <strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.</strong> WE EXPRESSLY DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul>
                <li><strong>MERCHANTABILITY</strong></li>
                <li><strong>FITNESS FOR A PARTICULAR PURPOSE</strong></li>
                <li><strong>NON-INFRINGEMENT</strong></li>
                <li><strong>ACCURACY OR RELIABILITY</strong></li>
                <li><strong>SECURITY OR DATA PROTECTION</strong></li>
                <li><strong>UNINTERRUPTED OR ERROR-FREE OPERATION</strong></li>
                <li><strong>COMPATIBILITY WITH YOUR SYSTEMS OR NEEDS</strong></li>
              </ul>
              <p>
                <strong>WE DO NOT WARRANT THAT THE SERVICE WILL MEET YOUR REQUIREMENTS, BE AVAILABLE AT ALL TIMES, BE SECURE, OR BE FREE OF BUGS, VIRUSES, OR OTHER HARMFUL COMPONENTS.</strong>
              </p>
            </div>
          </section>

          <section>
            <h2>10. LIMITATION OF LIABILITY</h2>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border-2 border-slate-300 dark:border-slate-600">
              <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">MAXIMUM PROTECTION FROM LIABILITY</p>
              <p>
                <strong>TO THE FULLEST EXTENT PERMITTED BY LAW, MAILMOP, ITS OWNERS, OPERATORS, EMPLOYEES, AGENTS, CONTRACTORS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY DAMAGES WHATSOEVER, INCLUDING BUT NOT LIMITED TO:</strong>
              </p>
              <ul>
                <li><strong>DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</strong></li>
                <li><strong>LOSS OF PROFITS, REVENUE, OR BUSINESS OPPORTUNITIES</strong></li>
                <li><strong>LOSS OF DATA, EMAILS, OR IMPORTANT INFORMATION</strong></li>
                <li><strong>BUSINESS INTERRUPTION OR OPERATIONAL DISRUPTION</strong></li>
                <li><strong>PERSONAL INJURY OR EMOTIONAL DISTRESS</strong></li>
                <li><strong>SECURITY BREACHES OR UNAUTHORIZED ACCESS</strong></li>
                <li><strong>ERRORS, BUGS, OR SYSTEM FAILURES</strong></li>
                <li><strong>THIRD-PARTY ACTIONS OR INTEGRATIONS</strong></li>
              </ul>
              <p>
                <strong>THIS LIMITATION APPLIES REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</strong>
              </p>
            </div>
            <p>
              <strong>IF ANY JURISDICTION DOES NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY, OUR LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUT IN NO EVENT SHALL EXCEED $10 USD.</strong>
            </p>
          </section>

          <section>
            <h2>11. INDEMNIFICATION</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4">
              <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">You Protect Us</p>
              <p>
                <strong>YOU AGREE TO INDEMNIFY, DEFEND, AND HOLD HARMLESS MAILMOP AND ITS OWNERS, OPERATORS, EMPLOYEES, AGENTS, AND AFFILIATES FROM AND AGAINST ANY AND ALL CLAIMS, DAMAGES, LOSSES, COSTS, AND EXPENSES</strong> (including reasonable attorneys' fees) arising from or relating to:
              </p>
              <ul>
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Any actions taken through your account</li>
                <li>Any loss of your email data or information</li>
                <li>Any consequences of email management actions you perform</li>
              </ul>
            </div>
          </section>

          <section>
            <h2>12. Third-Party Services and Integrations</h2>
            <p>
              MailMop relies on third-party services including Google's Gmail API, Supabase, Vercel, and Stripe. <strong>WE ARE NOT RESPONSIBLE FOR ANY ISSUES, OUTAGES, SECURITY BREACHES, OR PROBLEMS WITH THESE THIRD-PARTY SERVICES.</strong>
            </p>
            <p>
              Your use of these integrated services is subject to their respective terms of service and privacy policies.
            </p>
          </section>

          <section>
            <h2>13. Data Backup and Recovery</h2>
            <p>
              <strong>YOU ARE SOLELY RESPONSIBLE FOR BACKING UP YOUR EMAIL DATA.</strong> MailMop is not a backup service and we strongly recommend that you:
            </p>
            <ul>
              <li>Maintain regular backups of important emails</li>
              <li>Export critical data before using bulk action features</li>
              <li>Test MailMop features with non-critical emails first</li>
              <li>Understand that deleted emails may not be recoverable</li>
            </ul>
          </section>

          <section>
            <h2>14. Service Modifications and Termination</h2>
            <p>
              <strong>WE RESERVE THE RIGHT TO MODIFY, SUSPEND, OR DISCONTINUE THE SERVICE AT ANY TIME, WITH OR WITHOUT NOTICE, FOR ANY REASON.</strong> This includes:
            </p>
            <ul>
              <li>Changing features, functionality, or pricing</li>
              <li>Terminating user accounts</li>
              <li>Removing or limiting access to certain features</li>
              <li>Ceasing operations entirely</li>
            </ul>
            <p>
              <strong>YOU ACKNOWLEDGE THAT WE HAVE NO LIABILITY FOR ANY SUCH MODIFICATIONS OR TERMINATION.</strong>
            </p>
          </section>

          <section>
            <h2>15. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to conflict of law principles.
            </p>
            <p>
              <strong>ANY DISPUTES ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL BE RESOLVED THROUGH BINDING ARBITRATION</strong> in accordance with the American Arbitration Association's rules. You waive any right to trial by jury or to participate in class action lawsuits.
            </p>
          </section>

          <section>
            <h2>16. Severability and Entire Agreement</h2>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect. These Terms, together with our Privacy Policy and License, constitute the entire agreement between you and MailMop.
            </p>
          </section>

          <section>
            <h2>17. No Affiliation with Google or Gmail</h2>
            <p>
              MailMop is an independent product. It is <strong>not</strong> endorsed by, sponsored by, or
              affiliated with Google LLC or the Gmail service. All Google and Gmail trademarks are the
              property of Google LLC.
            </p>
          </section>

          <section>
            <h2>18. Age Requirements (13+)</h2>
            <p>
              You must be at least <strong>13&nbsp;years old</strong> to use MailMop. By accessing or using the
              Service, you represent that you are 13&nbsp;or older and have the legal capacity to enter
              into these Terms. If you are under&nbsp;18, you represent that your parent or legal guardian
              has reviewed and agreed to these Terms on your behalf.
            </p>
          </section>

          <section>
            <h2>19. Changes to These Terms</h2>
            <p>
              We may revise these Terms of Service from time to time. If we make material changes we
              will notify you by updating the "Last updated" date at the top of this page and, for
              significant changes, by displaying a prominent notice within the Service or via e-mail.
              <strong>Your continued use of MailMop after any changes means you accept the revised
              Terms.</strong>
            </p>
          </section>

          <section>
            <h2>20. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <ul>
              <li><strong>GitHub Issues:</strong> <a href="https://github.com/neilbhammar/mailmop/issues" target="_blank" rel="noopener noreferrer">Submit legal questions</a></li>
              <li><strong>Website:</strong> <a href="https://mailmop.com" target="_blank" rel="noopener noreferrer">mailmop.com</a></li>
            </ul>
          </section>

          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mt-8 border-2 border-gray-300 dark:border-gray-600">
            <p className="font-bold text-gray-800 dark:text-gray-200 mb-2">FINAL ACKNOWLEDGMENT</p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>BY USING MAILMOP, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE. YOU UNDERSTAND THAT YOU ARE ASSUMING ALL RISKS ASSOCIATED WITH USING THE SERVICE AND THAT MAILMOP HAS MAXIMUM PROTECTION FROM LIABILITY.</strong>
            </p>
          </div>
        </article>
      </div>
    </div>
  );
} 