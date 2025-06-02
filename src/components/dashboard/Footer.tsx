'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full max-w-7xl mx-auto pt-2 pb-2 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
      <div className="flex flex-wrap items-center justify-center gap-x-3">
        <span>© {currentYear} MailMop. All rights reserved</span>
        <div className="flex items-center gap-x-2">
          <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Privacy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Terms
          </Link>
          <span>•</span>
          <a 
            href="https://github.com/neilbhammar/mailmop" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
} 