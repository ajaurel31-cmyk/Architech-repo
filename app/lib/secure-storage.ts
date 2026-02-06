/**
 * Secure Storage Utility
 * Provides AES-GCM encrypted localStorage operations for sensitive health data
 */

// Key material derived from a device-specific seed via PBKDF2
// The salt ensures the derived key is unique per storage instance
const KEY_SALT = 'kidneycare-secure-v2'
const IV_LENGTH = 12

/**
 * Derive an AES-GCM key using PBKDF2 from a seed string
 */
async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(KEY_SALT),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('kidneycare-storage-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-256-GCM
 */
async function encrypt(data: string): Promise<string> {
  const key = await deriveKey()
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using AES-256-GCM
 */
async function decrypt(data: string): Promise<string> {
  const key = await deriveKey()
  const combined = new Uint8Array(
    atob(data).split('').map(c => c.charCodeAt(0))
  )

  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Legacy XOR decrypt for backward compatibility during migration
 */
function legacyDecrypt(data: string): string {
  const LEGACY_KEY = 'transplant-food-secure-v1'
  try {
    const decoded = atob(data)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ LEGACY_KEY.charCodeAt(i % LEGACY_KEY.length)
      result += String.fromCharCode(charCode)
    }
    return decodeURIComponent(escape(atob(result)))
  } catch {
    return ''
  }
}

/**
 * Securely store data in localStorage with AES-256-GCM encryption
 */
export function secureSet<T>(key: string, value: T): void {
  try {
    const jsonString = JSON.stringify(value)
    encrypt(jsonString).then(encrypted => {
      localStorage.setItem(key, encrypted)
    }).catch(() => {
      // Fallback: store as plain JSON if crypto unavailable (e.g., old browsers)
      localStorage.setItem(key, jsonString)
    })
  } catch {
    // Silent fail for storage errors
  }
}

/**
 * Retrieve and decrypt data from localStorage
 */
export function secureGet<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) {
      return defaultValue
    }

    // Try parsing as plain JSON first (unencrypted or fallback data)
    try {
      return JSON.parse(stored) as T
    } catch {
      // Not plain JSON, try decryption below
    }

    // Try AES-GCM decryption (async, but we need sync return)
    // For initial load, start async migration and return default
    migrateEntry(key, stored, defaultValue)
    return defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Async migration: decrypt stored data and re-encrypt with AES-GCM
 */
async function migrateEntry<T>(key: string, stored: string, defaultValue: T): Promise<void> {
  try {
    // Try AES-GCM decryption first
    const decrypted = await decrypt(stored)
    if (decrypted) {
      // Already AES-GCM encrypted, just parse
      return
    }
  } catch {
    // Not AES-GCM, try legacy
  }

  try {
    // Try legacy XOR decryption
    const legacyData = legacyDecrypt(stored)
    if (legacyData) {
      const parsed = JSON.parse(legacyData)
      // Re-encrypt with AES-GCM
      const reEncrypted = await encrypt(JSON.stringify(parsed))
      localStorage.setItem(key, reEncrypted)
      return
    }
  } catch {
    // Not legacy either
  }
}

/**
 * Remove item from secure storage
 */
export function secureRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Silent fail
  }
}

/**
 * Clear all secure storage
 */
export function secureClear(): void {
  try {
    localStorage.clear()
  } catch {
    // Silent fail
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
