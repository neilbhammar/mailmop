'use client'

import { CheckIcon } from '@radix-ui/react-icons'

interface LandingPricingProps {
  signIn: () => Promise<void>;
}

export default function LandingPricing({ signIn }: LandingPricingProps) {
  return (
    <section id="pricing" className="py-16 md:py-16 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 dark:text-slate-100">Cheaper than more Gmail Storage</h2>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto dark:text-slate-300">
              MailMop is source-available and can be self-hosted for free. These plans are for the hosted version.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 justify-center">
            {/* Free Tier - Simpler design */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Free</h3>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded dark:bg-blue-700/30 dark:text-blue-300">In Beta</span>
              </div>
              <div className="mb-6">
                <div className="text-3xl font-bold dark:text-slate-100">$0</div>
                <div className="text-gray-500 dark:text-slate-400">Forever free</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 dark:text-green-400" />
                  <span className="dark:text-slate-300">Unlimited inbox analysis</span>
                </li>
                <li className="flex">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 dark:text-green-400" />
                  <span className="dark:text-slate-300">Detailed sender statistics</span>
                </li>
                <li className="flex">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 dark:text-green-400" />
                  <span className="dark:text-slate-300">"View in Gmail" links</span>
                </li>
                <li className="flex">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 dark:text-green-400" />
                  <span className="dark:text-slate-300">Basic inbox insights</span>
                </li>
              </ul>
              <button onClick={signIn} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors dark:bg-blue-500 dark:hover:bg-blue-600">
                Join Waitlist
              </button>
            </div>
            
            {/* Pro Tier - Simpler design */}
            <div className="bg-white rounded-lg border-2 border-blue-200 shadow-sm p-8 max-w-md w-full hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-blue-700/50 dark:shadow-slate-900/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Pro</h3>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded dark:bg-blue-700/30 dark:text-blue-300">In Beta</span>
              </div>
              <div className="mb-6">
                <div className="text-3xl font-bold dark:text-slate-100">$1.89<span className="text-base font-normal text-gray-500 dark:text-slate-400">/month</span></div>
                <div className="text-gray-500 dark:text-slate-400">Billed annually ($22.68/year)</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 dark:text-green-400" />
                  <span className="dark:text-slate-300">Everything in Free</span>
                </li>
                <li className="flex">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 dark:text-green-400" />
                  <span className="dark:text-slate-300">One-click actions (unsubscribe, delete, block)</span>
                </li>
                <li className="flex">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 dark:text-green-400" />
                  <span className="dark:text-slate-300">Advanced cleaning tools & filters</span>
                </li>
                <li className="flex">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 dark:text-green-400" />
                  <span className="dark:text-slate-300">Bulk actions for thousands of emails</span>
                </li>
              </ul>
              <button className="w-full py-2 px-4 bg-gray-200 text-gray-500 font-medium rounded-md cursor-not-allowed dark:bg-slate-700 dark:text-slate-400">
                Coming Soon
              </button>
            </div>
          </div>
          
          <div className="mt-10 p-5 bg-blue-50 rounded-lg max-w-3xl mx-auto text-center dark:bg-slate-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              MailMop is currently in private beta. We're awaiting Google's security audit for public access.
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <a href="https://github.com/neilbhammar/mailmop" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-gray-600 hover:text-blue-600 text-sm dark:text-slate-400 dark:hover:text-blue-400">
              <svg className="h-4 w-4 mr-2 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Self-host MailMop from our GitHub repository
            </a>
          </div>
        </div>
      </div>
    </section>
  )
} 