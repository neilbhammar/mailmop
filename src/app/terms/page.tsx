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

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using MailMop (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              MailMop is a privacy-preserving Gmail analysis tool that helps users identify bulk senders, take action on unwanted emails, and declutter their inboxes. The Service operates primarily client-side and provides metadata-only analysis of Gmail accounts.
            </p>
          </section>

          <section>
            <h2>3. Privacy and Data Usage</h2>
            <p>
              MailMop is designed with privacy as a core principle. Our collection and use of personal information in connection with the Service is described in our <Link href="/privacy">Privacy Policy</Link>, which is incorporated by reference into these Terms.
            </p>
            <p>
              We do not store or process the content of your emails. All email analysis occurs directly in your browser, and sensitive data from your email content is not transmitted to our servers.
            </p>
          </section>

          <section>
            <h2>4. User Accounts and Google Authentication</h2>
            <p>
              To use MailMop, you must authenticate with a Google account. You are responsible for maintaining the confidentiality of your Google account credentials and for all activities that occur under your account when using MailMop. MailMop uses Google OAuth for authentication and stores access tokens securely in your browser's local storage. We do not store your Google password.
            </p>
          </section>

          <section>
            <h2>5. Service Availability and Beta Status</h2>
            <p>
              MailMop may be offered in a beta status, which means features may be incomplete, subject to change, or access may be restricted (e.g., to whitelisted users). We make no guarantees about the stability, availability, or functionality of the Service, especially during beta periods.
            </p>
            <p>
              The Service relies on the Gmail API. As such, MailMop is subject to Google's rate limits, service availability, API terms, and any changes Google may make to their API, which may affect MailMop's functionality.
            </p>
          </section>

          <section>
            <h2>6. Source Availability and Licensing</h2>
            <p>
              MailMop's source code is available for inspection on GitHub. This is provided for transparency and to allow users to verify our privacy and security claims. The source code is provided under a license that generally does not permit commercial use, redistribution, or the creation of derivative competing commercial services without explicit written permission from MailMop's creators.
            </p>
            <p>
              You may view, fork, and suggest modifications to the source code for personal, non-commercial purposes, subject to the specific terms of the license found in the GitHub repository.
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
            <h2>7. User Conduct and Responsibilities</h2>
            <p>
                You agree not to use the Service for any unlawful purpose or in any way that could harm, disable, overburden, or impair the Service or interfere with any other party's use and enjoyment of the Service. You are responsible for any actions you take within MailMop regarding your emails (e.g., deletion, unsubscribing).
            </p>
          </section>

          <section>
            <h2>8. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING OR USAGE OF TRADE. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE ERROR-FREE, UNINTERRUPTED, SECURE, OR THAT DEFECTS WILL BE CORRECTED. 
            </p>
          </section>

          <section>
            <h2>9. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL MAILMOP, ITS AFFILIATES, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO, DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES (EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES), ARISING OUT OF OR RELATING TO YOUR ACCESS TO OR USE OF, OR YOUR INABILITY TO ACCESS OR USE, THE SERVICE OR ANY CONTENT OR SERVICES THROUGH THE SERVICE.
            </p>
            <p>
                OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) THE AMOUNT, IF ANY, PAID BY YOU TO US FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) $50 USD.
            </p>
          </section>

          <section>
            <h2>10. Modifications to Service and Terms</h2>
            <p>
              We reserve the right to modify or discontinue the Service (or any part thereof) temporarily or permanently, with or without notice. We may also update these Terms of Service from time to time. If we make material changes, we will notify you by updating the date at the top of these Terms and, in some cases, may provide more prominent notice. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2>11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction - e.g., State of California, USA], without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2>12. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at [Your Contact Email Address or Link to Contact Form].
            </p>
          </section>
        </article>
      </div>
    </div>
  );
} 