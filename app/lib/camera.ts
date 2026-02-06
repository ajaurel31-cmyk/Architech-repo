/**
 * Check if we're running on a native platform (iOS/Android app)
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false

  // Check for Capacitor
  const win = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  if (win.Capacitor?.isNativePlatform) {
    return win.Capacitor.isNativePlatform()
  }

  // Fallback: check user agent for iOS WebView
  const ua = navigator.userAgent
  const isIOSWebView = /iPhone|iPad|iPod/.test(ua) && !/Safari/.test(ua)
  return isIOSWebView
}

/**
 * Show image source picker - returns null to indicate file input should be used
 * The HTML file input with capture="environment" will handle camera access
 */
export async function showImageSourcePicker(): Promise<string | null> {
  // Always return null - let the HTML file input handle it
  // This works better with remote URL loading
  return null
}
