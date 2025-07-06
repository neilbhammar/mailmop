'use client'

import { useState } from 'react';

const faqs = [
  {
    id: 'why-exist',
    question: "Why does MailMop exist?",
    answer: "I really built this for myself :) I needed a better, more secure way to clean up my inbox. Figured I'd make it available to everyone else, too!"
  },
  {
    id: 'local-processing',
    question: 'What does "emails processed locally" mean?',
    answer: "Traditional email cleaning tools store and analyze your emails on their servers (like their own remote computers) - MailMop makes sure your emails are processed on your own device."
  },
  {
    id: 'safety',
    question: "How do I know that MailMop is safe?",
    answer: "Good question! You can actually read through all of our code here. We also passed Google's Third Party CASA Certification.",
    answerWithLink: <>Good question! You can actually read through all of our code <a href="https://github.com/neilbhammar/mailmop" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500">here</a>. We also passed Google's Third Party CASA Certification.</>
  },
  {
    id: 'paid-plan',
    question: "Why is there a paid plan?",
    answer: "Just to cover costs! Not trying to build a business here - just a cool utility tool. The pro subscription just helps pay for hosting and Google's annual security audit."
  },
  {
    id: 'email-limit',
    question: "How many emails can MailMop process?",
    answer: "There's no limit! Everything happens in your browser, so the more emails you're processing, the more time processing will take. An inbox with 25,000 emails would take about 10 minutes to analyze, but you'll start to see results immediately."
  },
  {
    id: 'data-storage',
    question: "Does MailMop store any information?",
    answer: "Just the fact that you are a user (so that you can login successfully) and basic analytics logging (like whether you performed a certain action) to help improve the product."
  }
];

export default function LandingFaq() {
  const [openId, setOpenId] = useState('why-exist');

  const toggleQuestion = (id: string) => {
    setOpenId(openId === id ? '' : id);
  };

  return (
    <section id="faq" className="py-16 md:py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 dark:text-slate-100">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto dark:text-slate-300">
              Everything you need to know about MailMop
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto border-t border-gray-100 dark:border-slate-700">
            {faqs.map((faq) => (
              <div 
                key={faq.id}
                className="border-b border-gray-100 last:border-b-0 dark:border-slate-700"
              >
                <button
                  onClick={() => toggleQuestion(faq.id)}
                  className="w-full text-left py-6 flex items-start justify-between focus:outline-none group"
                  aria-expanded={openId === faq.id}
                  aria-controls={`answer-${faq.id}`}
                >
                  <h3 className="text-lg font-medium text-gray-900 pr-8 group-hover:text-blue-600 transition-colors dark:text-slate-100 dark:group-hover:text-blue-400">{faq.question}</h3>
                  <span className={`flex items-center justify-center h-6 w-6 text-gray-400 transition-transform duration-200 dark:text-slate-500 ${openId === faq.id ? 'transform rotate-45' : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 0V14M0 7H14" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </span>
                </button>
                
                <div 
                  id={`answer-${faq.id}`}
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openId === faq.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                  aria-hidden={openId !== faq.id}
                >
                  <div className="pb-6 text-base text-gray-600 pr-12 dark:text-slate-300">
                    {faq.answerWithLink ? faq.answerWithLink : faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 