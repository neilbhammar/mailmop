import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/context/AuthProvider'
import { GmailConnectionStatus } from './GmailConnectionStatus'
import { UserDropdown } from './UserDropdown'
import { useTheme } from 'next-themes'
import { useMounted } from '@/hooks/useMounted'

export function TopBar() {
  // Get user from auth context - we'll only use the type for now
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()

  return (
    // Container with padding and full width
    <div className="w-full px-4 py-3">
      {/* Navigation bar with modern floating design */}
      <nav className="relative flex items-center justify-between max-w-7xl mx-auto px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-slate-900/50">
        {/* Logo Section */}
        <Link href="/dashboard" className="flex items-center space-x-2">
          {mounted && (
            <Image
              src={resolvedTheme === 'dark' ? '/darklogo9.png' : '/logo9.png'}
              alt="MailMop Logo"
              width={140}
              height={30}
              className="h-auto w-[140px] object-contain"
            />
          )}
          {!mounted && (
             <Image
              src={'/logo9.png'}
              alt="MailMop Logo"
              width={140}
              height={30}
              className="h-auto w-[140px] object-contain"
            />
          )}
        </Link>

        {/* Right Section with Gmail status and user dropdown */}
        <div className="flex items-center gap-6">
          <GmailConnectionStatus />
          {user && <UserDropdown user={user} />}
        </div>
      </nav>
    </div>
  )
} 