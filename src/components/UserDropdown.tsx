import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { ChevronDown, Settings, CreditCard, HelpCircle, LogOut, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'

interface UserDropdownProps {
  user: User
}

export function UserDropdown({ user }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useAuth()

  return (
    <div className="relative">
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3"
      >
        <div className="flex items-center space-x-3">
          {/* Avatar - using first letter as placeholder */}
          <div className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
            {user.email?.[0].toUpperCase()}
          </div>
          
          {/* Name and Email */}
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {user.user_metadata?.full_name || 'User'}
            </div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        </div>
        
        {/* Chevron */}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-lg">
          <div className="py-1">
            {/* Revoke Gmail Access */}
            <button
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4 mr-3" />
              Revoke Gmail Access
            </button>

            {/* Manage Plan */}
            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <CreditCard className="w-4 h-4 mr-3" />
              <span>Manage Plan</span>
              <span className="ml-auto text-xs text-blue-600 font-medium">Free</span>
            </button>

            {/* Contact Support */}
            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <HelpCircle className="w-4 h-4 mr-3" />
              Contact Support
            </button>

            {/* Divider */}
            <div className="h-px my-1 bg-gray-100" />

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 