import { cn } from '@/lib/utils'
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { useState } from 'react'

// For now, we'll just create a visual representation without the actual functionality
export function GmailConnectionStatus() {
  const { isTokenValid, requestPermissions } = useGmailPermissions()
  const [isHovered, setIsHovered] = useState(false)
  
  const handleClick = () => {
    if (!isTokenValid) {
      requestPermissions()
    }
  }
  
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "flex items-center px-2.5 py-1.5 space-x-2 text-xs border rounded-md transition-colors",
          isTokenValid
            ? "border-gray-100 text-gray-600 cursor-default"
            : "border-red-100 text-red-600 hover:bg-red-50"
        )}
      >
        <div className="relative flex items-center">
          {/* Status dot */}
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isTokenValid ? "bg-green-500" : "bg-red-500"
            )}
          />
          {/* Pulse effect for disconnected state */}
          {!isTokenValid && (
            <div className="absolute w-1.5 h-1.5 rounded-full animate-ping bg-red-500 opacity-75" />
          )}
        </div>
        <span>
          {isTokenValid ? "Gmail Connected" : "Reconnect Gmail"}
        </span>
      </button>

      {/* Custom hover tooltip */}
      {isHovered && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 p-4 bg-white text-gray-600 text-sm rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="relative">
            <div className="font-medium mb-1">
              {isTokenValid ? "Gmail Connected" : "Gmail Connection Required"}
            </div>
            <div className="text-gray-500 text-xs">
              {isTokenValid 
                ? "MailMop has the right access to help clean your inbox. Click on your profile to revoke access."
                : "Authorizing is required for analyzing, deleting, and unsubscribing"
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 