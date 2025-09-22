'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useMounted } from '@/hooks/useMounted'

interface LandingNavbarProps {
  signIn: () => Promise<void>;
}

export default function LandingNavbar({ signIn }: LandingNavbarProps) {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()

  const handleNavLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();
    
    // Use native smooth scrolling with CSS scroll-behavior
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      const offsetTop = targetElement.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full py-3 backdrop-blur-md bg-white/80 border-b border-gray-100 dark:bg-slate-900/80 dark:border-slate-800">
      <nav className="container mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center space-x-2">
          {mounted && (
          <Image
              src={resolvedTheme === 'dark' ? '/darklogo.png' : '/logo9.png'}
            alt="MailMop Logo"
            width={140}
            height={30}
            className="h-auto w-[140px] object-contain"
              priority
          />
          )}
          {!mounted && (
            <div style={{ width: 140, height: 30 }} aria-label="Loading logo..." />
          )}
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <a 
            href="#how-it-works" 
            onClick={(e) => handleNavLinkClick(e, '#how-it-works')}
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium dark:text-slate-300 dark:hover:text-blue-400"
          >
            How it works
          </a>
          <a 
            href="#privacy" 
            onClick={(e) => handleNavLinkClick(e, '#privacy')}
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium dark:text-slate-300 dark:hover:text-blue-400"
          >
            Privacy
          </a>
          <a 
            href="#faq" 
            onClick={(e) => handleNavLinkClick(e, '#faq')}
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium dark:text-slate-300 dark:hover:text-blue-400"
          >
            FAQ
          </a>
          <a 
            href="https://github.com/neilbhammar/mailmop" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center dark:text-slate-300 dark:hover:text-blue-400"
          >
            <svg className="h-5 w-5 mr-1 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub
          </a>
        </div>
        
        <button 
          onClick={signIn} 
          className="hidden md:flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-transparent text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm border border-gray-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:border-slate-700 dark:shadow-md"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" className="dark:brightness-[.85] dark:saturate-150">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
            </g>
          </svg>
          <span>Continue with Google</span>
        </button>
      </nav>
    </header>
  )
} 