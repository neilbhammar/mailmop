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
  const { tokenStatus, requestPermissions } = useGmailPermissions()
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
    if (tokenStatus.state !== 'valid') return

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
    switch (tokenStatus.state) {
      case 'valid':
        return "border-gray-100 text-gray-600 cursor-default"
      case 'expiring_soon':
        return "border-yellow-100 text-yellow-600 hover:bg-yellow-50"
      case 'expired':
        return "border-red-100 text-red-600 hover:bg-red-50"
    }
  }

  const getStatusDot = () => {
    switch (tokenStatus.state) {
      case 'valid':
        return "bg-green-500"
      case 'expiring_soon':
        return "bg-yellow-500"
      case 'expired':
        return "bg-red-500"
    }
  }

  const getStatusText = () => {
    switch (tokenStatus.state) {
      case 'valid':
        return "Gmail Connected"
      case 'expiring_soon': {
        const minutesLeft = Math.ceil(tokenStatus.timeRemaining / (60 * 1000))
        return `Gmail Connection Expires in ${minutesLeft}m`
      }
      case 'expired':
        return "Reconnect Gmail"
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
          {tokenStatus.state !== 'valid' && (
            <div className={cn(
              "absolute w-1.5 h-1.5 rounded-full animate-ping opacity-75",
              getStatusDot()
            )} />
          )}
        </div>
        <span>{getStatusText()}</span>
      </button>

      {/* Custom hover tooltip */}
      {isHovered && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 p-4 bg-white text-gray-600 text-sm rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="relative">
            <div className="font-medium mb-1">
              {tokenStatus.state === 'valid' ? "Gmail Connected" : "Gmail Connection Required"}
            </div>
            <div className="text-gray-500 text-xs">
              {tokenStatus.state === 'valid' 
                ? `MailMop has the right access to help clean your inbox. Click on your profile to revoke access. Token expires in ${formatTimeRemaining(localTimeRemaining)}.`
                : tokenStatus.state === 'expiring_soon'
                  ? `Your Gmail access will expire in ${formatTimeRemaining(localTimeRemaining)}. Click to refresh access.`
                  : "Authorizing is required for analyzing, deleting, and unsubscribing"
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 