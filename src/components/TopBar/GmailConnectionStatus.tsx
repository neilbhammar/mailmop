import { cn } from '@/lib/utils'
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { useState, useEffect, useRef } from 'react'

// Helper to format time remaining
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const minutes = Math.floor(ms / (60 * 1000))
  const seconds = Math.floor((ms % (60 * 1000)) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// For now, we'll just create a visual representation without the actual functionality
export function GmailConnectionStatus() {
  const { tokenStatus, requestPermissions, hasRefreshToken, refreshTokenState } = useGmailPermissions()
  const [isHovered, setIsHovered] = useState(false)
  const [localTimeRemaining, setLocalTimeRemaining] = useState(tokenStatus.timeRemaining)
  const lastUpdateTimeRef = useRef(Date.now())
  
  // Update local time when token status changes
  useEffect(() => {
    setLocalTimeRemaining(tokenStatus.timeRemaining)
    lastUpdateTimeRef.current = Date.now()
  }, [tokenStatus.timeRemaining])

  // Continuous timer that runs regardless of tooltip visibility
  useEffect(() => {
    if (tokenStatus.state !== 'valid' && tokenStatus.state !== 'expiring_soon') return

    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current
      const newTimeRemaining = tokenStatus.timeRemaining - timeSinceLastUpdate
      setLocalTimeRemaining(Math.max(0, newTimeRemaining))
    }, 1000)

    return () => clearInterval(interval)
  }, [tokenStatus.state, tokenStatus.timeRemaining])

  const handleClick = () => {
    if (tokenStatus.state !== 'valid') {
      requestPermissions()
    }
  }

  // Helper for status styling
  const getStatusStyles = () => {
    if (refreshTokenState === 'unknown') {
      // Neutral style for initializing
      return "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 cursor-default"; 
    }
    if (hasRefreshToken) { // refreshTokenState === 'present'
      return "border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 cursor-default"; 
    }
    // refreshTokenState === 'absent'
    return "border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer";
  }

  const getStatusDot = () => {
    if (refreshTokenState === 'unknown') {
      return "bg-gray-400 dark:bg-slate-500"; // Neutral dot for initializing
    }
    if (hasRefreshToken) { // refreshTokenState === 'present'
      return "bg-green-500 dark:bg-green-400";
    }
    // refreshTokenState === 'absent'
    return "bg-red-500 dark:bg-red-400";
  }

  const getStatusText = () => {
    if (refreshTokenState === 'unknown') {
      return "Checking..."
    }
    if (hasRefreshToken) { // refreshTokenState === 'present'
      return "Gmail Connected";
    }
    // refreshTokenState === 'absent'
    return "Reconnect Gmail";
  }
  
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "flex items-center px-2.5 py-1.5 space-x-2 text-xs border rounded-md transition-colors",
          getStatusStyles()
        )}
      >
        <div className="relative flex items-center">
          {/* Status dot */}
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              getStatusDot()
            )}
          />
          {/* Pulse effect for non-valid states */}
          {/* Show pulse only if refresh token is missing (absent), or if initializing */}
          {(refreshTokenState === 'absent' || refreshTokenState === 'unknown') && (
            <div className={cn(
              "absolute w-1.5 h-1.5 rounded-full animate-ping opacity-75",
              // Pulse is red for absent, gray for unknown
              refreshTokenState === 'absent' ? "bg-red-500 dark:bg-red-400" : "bg-gray-400 dark:bg-slate-500"
            )} />
          )}
        </div>
        <span>{getStatusText()}</span>
      </button>

      {/* Custom hover tooltip */}
      {isHovered && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 p-4 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-sm rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-slate-900/50 border border-transparent dark:border-slate-700">
          <div className="relative">
            <div className="font-medium mb-1 text-gray-700 dark:text-slate-100">
              {refreshTokenState === 'unknown'
                ? "Checking Gmail Connection..."
                : hasRefreshToken 
                  ? "Gmail Connection Status" 
                  : "Gmail Connection Required"}
            </div>
            <div className="text-gray-500 dark:text-slate-400 text-xs">
              {refreshTokenState === 'unknown'
                ? "Please wait while we verify your Gmail connection."
                : !hasRefreshToken // refreshTokenState === 'absent'
                  ? "MailMop needs to connect to your Gmail account. Click to grant access."
                  // refreshTokenState === 'present'
                  : (tokenStatus.state === 'valid' || tokenStatus.state === 'expiring_soon') 
                    ? localTimeRemaining > 0 
                      ? `MailMop has the access it needs to help you declutter your inbox. Access token will automatically refresh in ${formatTimeRemaining(localTimeRemaining)}.`
                      : `MailMop has the access it needs to help you declutter your inbox. Access token will automatically refresh upon action.` 
                    : `MailMop has the access it needs to help you declutter your inbox. Access token will automatically refresh upon action.` // Covers 'expired' state (when refresh token is present)
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 