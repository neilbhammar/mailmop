import { supabase } from '@/supabase/client'

export function BetaWaitlistModal() {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Welcome to MailMop Beta!</h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Thanks for your interest! MailMop is currently in private beta. We're working hard to open it up to everyone soon.
        </p>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Want early access? Follow us on Twitter <a href="https://twitter.com/mailmop" className="text-blue-500 hover:text-blue-600">@mailmop</a> for updates and beta access codes!
        </p>

        <button
          onClick={handleSignOut}
          className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
} 