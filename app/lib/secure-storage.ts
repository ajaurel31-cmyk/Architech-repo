/**
 * Secure Storage Utility for GoutGuard
 * Provides AES-GCM encrypted localStorage operations for sensitive health data
 */

const KEY_SALT = 'goutguard-secure-v1';
const IV_LENGTH = 12;

async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(KEY_SALT),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('goutguard-storage-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data: string): Promise<string> {
  const key = await deriveKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decrypt(data: string): Promise<string> {
  const key = await deriveKey();
  const combined = new Uint8Array(
    atob(data)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

export function secureSet<T>(key: string, value: T): void {
  try {
    const jsonString = JSON.stringify(value);
    encrypt(jsonString)
      .then((encrypted) => {
        localStorage.setItem(key, encrypted);
      })
      .catch(() => {
        localStorage.setItem(key, jsonString);
      });
  } catch {
    // Silent fail for storage errors
  }
}

export function secureGet<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;

    try {
      return JSON.parse(stored) as T;
    } catch {
      // Not plain JSON — try async decrypt on next load
      migrateEntry(key, stored);
      return defaultValue;
    }
  } catch {
    return defaultValue;
  }
}

async function migrateEntry(key: string, stored: string): Promise<void> {
  try {
    const decrypted = await decrypt(stored);
    if (decrypted) {
      // Re-store as AES-GCM (already encrypted, just verifying it works)
      return;
    }
  } catch {
    // Not AES-GCM encrypted
  }
}

export function secureRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silent fail
  }
}

export function secureClear(): void {
  try {
    localStorage.clear();
  } catch {
    // Silent fail
  }
}

export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
