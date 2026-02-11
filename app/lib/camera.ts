/**
 * Camera utilities for GoutGuard food scanning
 */

/**
 * Check if we're running on a native platform (iOS/Android app)
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;

  const win = window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  if (win.Capacitor?.isNativePlatform) {
    return win.Capacitor.isNativePlatform();
  }

  const ua = navigator.userAgent;
  const isIOSWebView = /iPhone|iPad|iPod/.test(ua) && !/Safari/.test(ua);
  return isIOSWebView;
}

/**
 * Show image source picker - returns null to indicate file input should be used.
 * The HTML file input with capture="environment" handles camera access.
 */
export async function showImageSourcePicker(): Promise<string | null> {
  return null;
}
