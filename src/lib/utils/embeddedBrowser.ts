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
  
  // List of known embedded browsers/webviews that Google blocks
  const embeddedBrowserPatterns = [
    // Social media embedded browsers
    /FBAN|FBAV/i,           // Facebook
    /Instagram/i,           // Instagram
    /LinkedIn/i,            // LinkedIn
    /Line/i,                // Line
    /Snapchat/i,            // Snapchat
    /Twitter/i,             // Twitter
    /Pinterest/i,           // Pinterest
    /TikTok/i,              // TikTok
    /WhatsApp/i,            // WhatsApp
    /Telegram/i,            // Telegram
    /Discord/i,             // Discord
    
    // General webview patterns
    /WebView/i,             // Android WebView
    /wv\)/i,                // Android WebView (alternative pattern)
    
    // Email client embedded browsers
    /Outlook/i,             // Outlook
    /Thunderbird/i,         // Thunderbird
    
    // Other messaging/social apps
    /Messenger/i,           // Facebook Messenger
    /WeChat/i,              // WeChat
    /QQBrowser/i,           // QQ Browser
    /MicroMessenger/i,      // WeChat (alternative pattern)
    /KakaoTalk/i,           // KakaoTalk
    /KAKAOTALK/i,           // KakaoTalk (alternative pattern)
    
    // News/content apps
    /NewsArticle/i,         // News apps
    /SmartNews/i,           // SmartNews
    /FlipboardProxy/i,      // Flipboard
    
    // Additional patterns for safety
    /GSA\/\d+\.\d+/i,       // Google Search App
    /Embeddable/i,          // Generic embedded indicator
    /InAppBrowser/i,        // Cordova InAppBrowser
  ];

  // Check if any pattern matches
  const isDetectedEmbedded = embeddedBrowserPatterns.some(pattern => pattern.test(userAgent));
  
  // Special handling for iOS: exclude real Safari mobile browsers
  // Real Safari mobile has "Version/" and "Safari/" but NOT the embedded app patterns above
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    // If it has Version/ and Safari/ and none of the embedded patterns, it's real Safari
    const hasVersionAndSafari = /Version\/[\d.]+.*Safari\/[\d.]+/i.test(userAgent);
    if (hasVersionAndSafari && !isDetectedEmbedded) {
      return false; // This is real Safari mobile, not embedded
    }
    
    // Additional check: if it's missing "Version/" but has "Mobile/" it's likely embedded
    // But we need to be careful not to catch real Safari
    const isMobileWithoutVersion = /Mobile\/[\w\d]+/i.test(userAgent) && !/Version\//i.test(userAgent);
    if (isMobileWithoutVersion && !isDetectedEmbedded) {
      // This could be an embedded browser, but let's be conservative
      // Only flag as embedded if we have other indicators
      return false;
    }
  }

  return isDetectedEmbedded;
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
  if (/Line/i.test(userAgent)) return 'Line';
  if (/Snapchat/i.test(userAgent)) return 'Snapchat';
  if (/Twitter/i.test(userAgent)) return 'Twitter';
  if (/Pinterest/i.test(userAgent)) return 'Pinterest';
  if (/TikTok/i.test(userAgent)) return 'TikTok';
  if (/WhatsApp/i.test(userAgent)) return 'WhatsApp';
  if (/Telegram/i.test(userAgent)) return 'Telegram';
  if (/Discord/i.test(userAgent)) return 'Discord';
  if (/Messenger/i.test(userAgent)) return 'Messenger';
  if (/WeChat|MicroMessenger/i.test(userAgent)) return 'WeChat';
  if (/Outlook/i.test(userAgent)) return 'Outlook';
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