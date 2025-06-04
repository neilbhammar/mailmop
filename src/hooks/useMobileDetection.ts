'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect if the user is on a mobile device
 * Uses both user agent detection and screen size for accurate mobile detection
 * @returns {boolean} - true if on mobile device, false otherwise
 */
export function useMobileDetection(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      // Check user agent for mobile devices
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      const isUserAgentMobile = mobileRegex.test(userAgent)

      // Check screen size (tablets and small screens)
      const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth <= 500 : false

      // Consider it mobile if either condition is true
      setIsMobile(isUserAgentMobile || isSmallScreen)
    }

    // Initial check
    checkMobile()

    // Add resize listener to handle screen size changes (e.g., browser resize)
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile)
      
      // Cleanup listener
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return isMobile
} 