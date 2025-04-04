import { cn } from '@/lib/utils'

// For now, we'll just create a visual representation without the actual functionality
export function GmailConnectionStatus() {
  // Hardcoded to true for now - we'll add real functionality later
  const isValid = true
  
  return (
    <button
      className={cn(
        "flex items-center px-2.5 py-1.5 space-x-2 text-xs border rounded-md transition-colors",
        isValid
          ? "border-gray-100 text-gray-600"
          : "border-red-100 text-red-600 hover:bg-red-50"
      )}
    >
      <div className="relative flex items-center">
        {/* Status dot */}
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            isValid ? "bg-green-500" : "bg-red-500"
          )}
        />
        {/* Pulse effect for disconnected state */}
        {!isValid && (
          <div className="absolute w-1.5 h-1.5 rounded-full animate-ping bg-red-500 opacity-75" />
        )}
      </div>
      <span>
        {isValid ? "Gmail Connected" : "Reconnect Gmail"}
      </span>
    </button>
  )
} 