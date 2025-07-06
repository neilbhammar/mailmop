'use client'

import { CheckIcon } from '@radix-ui/react-icons'
import { useProUpgrade } from '@/hooks/useProUpgrade'

interface LandingPricingProps {
  signIn: () => Promise<void>;
}

export default function LandingPricing({ signIn }: LandingPricingProps) {
  const { initiateProUpgrade, isLoading: isUpgradeLoading } = useProUpgrade();

  return (
    <section id="pricing" className="py-16 md:py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 dark:text-slate-100">
              Cheaper Than More Gmail Storage
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto dark:text-slate-300">
              Mailmop can be self hosted for frege. This pricing is for the hosted version.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto items-start">
            {/* Free Tier */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 dark:bg-slate-800 dark:border-slate-700 flex-1">
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 dark:text-slate-100">Basic</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">Free</span>
                  <span className="text-gray-500 ml-2 dark:text-slate-400">forever</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">Secure local processing and storage</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">Unlimited inbox analysis</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">Detailed sender statistics</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">Export data</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">"View in Gmail" links</span>
                </li>
              </ul>
              
              <button 
                onClick={signIn} 
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors border border-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 dark:border-slate-600"
              >
                Get Started Free
              </button>
            </div>
            
            {/* Pro Tier */}
            <div className="relative bg-white rounded-xl border-2 border-blue-500 p-8 shadow-lg dark:bg-slate-800 dark:border-blue-500 flex-1">
              {/* Popular badge - more subtle */}
              <div className="absolute -top-3 left-6">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Popular
                </span>
              </div>
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 dark:text-slate-100">Pro</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">$1.89</span>
                  <span className="text-gray-500 ml-0 dark:text-slate-400">/month</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 dark:text-slate-400">
                  Billed annually at $22.68/year
                </p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">Everything in Free</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">One-click bulk actions</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">Auto-unsubscribe</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">Advanced filtering & labels</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-slate-300">Bulk actions</span>
                </li>
              </ul>
              
              <button 
                onClick={initiateProUpgrade}
                disabled={isUpgradeLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpgradeLoading ? 'Setting up your upgrade...' : 'Get Pro Now'}
              </button>
            </div>

          </div>
          
          <div className="mt-8 text-center">
            <a 
              href="https://github.com/neilbhammar/mailmop" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors dark:text-slate-400 dark:hover:text-slate-300"
            >
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Self-host for free on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  )
} 