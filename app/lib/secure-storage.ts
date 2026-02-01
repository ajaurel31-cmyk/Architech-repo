/**
 * Secure Storage Utility
 * Provides encrypted localStorage operations for sensitive data
 */

// Simple encryption key derived from a constant (in production, use a more secure key derivation)
const ENCRYPTION_KEY = 'transplant-food-secure-v1'

/**
 * Simple XOR-based encryption for localStorage
 * Note: For production apps handling PHI, use a proper encryption library like crypto-js
 */
function encrypt(data: string): string {
  const encoded = btoa(unescape(encodeURIComponent(data)))
  let result = ''
  for (let i = 0; i < encoded.length; i++) {
    const charCode = encoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    result += String.fromCharCode(charCode)
  }
  return btoa(result)
}

function decrypt(data: string): string {
  try {
    const decoded = atob(data)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      result += String.fromCharCode(charCode)
    }
    return decodeURIComponent(escape(atob(result)))
  } catch {
    return ''
  }
}

/**
 * Securely store data in localStorage with encryption
 */
export function secureSet<T>(key: string, value: T): void {
  try {
    const jsonString = JSON.stringify(value)
    const encrypted = encrypt(jsonString)
    localStorage.setItem(key, encrypted)
  } catch (error) {
    console.error('Error saving to secure storage:', error)
  }
}

/**
 * Retrieve and decrypt data from localStorage
 */
export function secureGet<T>(key: string, defaultValue: T): T {
  try {
    const encrypted = localStorage.getItem(key)
    if (!encrypted) {
      return defaultValue
    }

    const decrypted = decrypt(encrypted)
    if (!decrypted) {
      // Try reading as plain JSON for backward compatibility
      try {
        return JSON.parse(encrypted) as T
      } catch {
        return defaultValue
      }
    }

    return JSON.parse(decrypted) as T
  } catch (error) {
    console.error('Error reading from secure storage:', error)
    return defaultValue
  }
}

/**
 * Remove item from secure storage
 */
export function secureRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error removing from secure storage:', error)
  }
}

/**
 * Clear all secure storage
 */
export function secureClear(): void {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('Error clearing secure storage:', error)
  }
}

/**
 * Check if secure storage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}
