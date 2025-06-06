/**
 * Detects if the user is viewing the app in an embedded browser/webview
 * These browsers are blocked by Google OAuth for security reasons
 */
export function isEmbeddedBrowser(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Be very conservative - only flag browsers we KNOW are embedded
  // These patterns are specific enough to avoid false positives with legitimate mobile browsers
  const knownEmbeddedBrowserPatterns = [
    // Social media embedded browsers - very specific patterns
    /FBAN\/\w+/i,           // Facebook app browser (specific pattern)
    /FBAV\/[\d.]+/i,        // Facebook app version pattern
    /Instagram/i,           // Instagram (usually safe to detect)
    /LinkedIn/i,            // LinkedIn (usually safe to detect)
    /Snapchat/i,            // Snapchat (usually safe to detect)
    /TikTok/i,              // TikTok (usually safe to detect)
    
    // Messaging apps - very specific
    /Messenger/i,           // Facebook Messenger
    /WhatsApp/i,            // WhatsApp
    /Telegram/i,            // Telegram
    /WeChat/i,              // WeChat
    /MicroMessenger/i,      // WeChat alternative pattern
    /KakaoTalk/i,           // KakaoTalk
    /KAKAOTALK/i,           // KakaoTalk alternative pattern
    
    // Only very specific webview patterns that are clear
    /; wv\)/i,              // Android WebView specific pattern (note the semicolon and space)
    /InAppBrowser/i,        // Cordova InAppBrowser
  ];

  // Check if any of the known embedded patterns match
  const isKnownEmbedded = knownEmbeddedBrowserPatterns.some(pattern => pattern.test(userAgent));
  
  if (isKnownEmbedded) {
    return true;
  }

  // For iOS, be extra careful - only flag if we have very specific indicators
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    // Real Safari mobile always has both "Version/" and "Safari/"
    const hasVersionAndSafari = /Version\/[\d.]+.*Safari\/[\d.]+/i.test(userAgent);
    
    // If it has Version/ and Safari/, it's real Safari - never flag as embedded
    if (hasVersionAndSafari) {
      return false;
    }
    
    // If it's missing Version/ but has Mobile/, it MIGHT be embedded
    // But only flag if it also has other suspicious patterns
    const isMobileWithoutVersion = /Mobile\/[\w\d]+/i.test(userAgent) && !/Version\//i.test(userAgent);
    if (isMobileWithoutVersion) {
      // Only flag as embedded if it has additional suspicious indicators
      // For now, be conservative and don't flag these
      return false;
    }
  }

  // For Android, be very careful too
  if (/Android/i.test(userAgent)) {
    // Legitimate Chrome mobile has "Chrome/" and doesn't have suspicious patterns
    const hasChrome = /Chrome\/[\d.]+/i.test(userAgent);
    
    // Google app has specific patterns we can check for
    const isGoogleApp = /GSA\/[\d.]+/i.test(userAgent);
    
    // If it's Google app, don't flag as embedded (it's a legitimate browser context)
    if (isGoogleApp) {
      return false;
    }
    
    // If it has Chrome/, it's likely legitimate
    if (hasChrome) {
      return false;
    }
  }

  // Default to not embedded - be conservative
  return false;
}

/**
 * Gets a user-friendly name for the detected embedded browser
 */
export function getEmbeddedBrowserName(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'embedded app';
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  if (/FBAN|FBAV/i.test(userAgent)) return 'Facebook';
  if (/Instagram/i.test(userAgent)) return 'Instagram';
  if (/LinkedIn/i.test(userAgent)) return 'LinkedIn';
  if (/Snapchat/i.test(userAgent)) return 'Snapchat';
  if (/TikTok/i.test(userAgent)) return 'TikTok';
  if (/WhatsApp/i.test(userAgent)) return 'WhatsApp';
  if (/Telegram/i.test(userAgent)) return 'Telegram';
  if (/Discord/i.test(userAgent)) return 'Discord';
  if (/Messenger/i.test(userAgent)) return 'Messenger';
  if (/WeChat|MicroMessenger/i.test(userAgent)) return 'WeChat';
  if (/KakaoTalk|KAKAOTALK/i.test(userAgent)) return 'KakaoTalk';
  
  // Generic fallback
  return 'this app';
}

/**
 * Gets the appropriate external browser name for the user's platform
 */
export function getSystemBrowserName(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'your browser';
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Detect platform and suggest appropriate browser
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'Safari';
  } else if (/Android/i.test(userAgent)) {
    return 'Chrome';
  } else if (/Mac/i.test(userAgent)) {
    return 'Safari or Chrome';
  } else {
    return 'your browser';
  }
} 