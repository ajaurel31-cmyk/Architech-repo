/**
 * Input Validation Utilities
 * Provides schema validation for API inputs and data
 */

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate medication data structure
 */
export interface Medication {
  id: string
  name: string
  dosage: string
  times: string[]
  notes: string
  withFood: boolean
}

export function validateMedication(data: unknown): ValidationResult {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid medication data'] }
  }

  const med = data as Record<string, unknown>

  if (typeof med.id !== 'string' || med.id.length === 0) {
    errors.push('Invalid medication ID')
  }

  if (typeof med.name !== 'string' || med.name.length === 0 || med.name.length > 200) {
    errors.push('Medication name must be 1-200 characters')
  }

  if (typeof med.dosage !== 'string' || med.dosage.length > 200) {
    errors.push('Dosage must be under 200 characters')
  }

  if (!Array.isArray(med.times)) {
    errors.push('Times must be an array')
  } else {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    for (const time of med.times) {
      if (typeof time !== 'string' || !timeRegex.test(time)) {
        errors.push(`Invalid time format: ${time}`)
      }
    }
  }

  if (typeof med.notes !== 'string' || med.notes.length > 1000) {
    errors.push('Notes must be under 1000 characters')
  }

  if (typeof med.withFood !== 'boolean') {
    errors.push('withFood must be a boolean')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate array of medications
 */
export function validateMedications(data: unknown): ValidationResult {
  const errors: string[] = []

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['Medications must be an array'] }
  }

  if (data.length > 100) {
    errors.push('Maximum 100 medications allowed')
  }

  for (let i = 0; i < data.length; i++) {
    const result = validateMedication(data[i])
    if (!result.valid) {
      errors.push(`Medication ${i + 1}: ${result.errors.join(', ')}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate push subscription object
 */
export function validatePushSubscription(data: unknown): ValidationResult {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid subscription data'] }
  }

  const sub = data as Record<string, unknown>

  if (typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://')) {
    errors.push('Invalid endpoint URL')
  }

  if (!sub.keys || typeof sub.keys !== 'object') {
    errors.push('Missing subscription keys')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate notification payload
 */
export function validateNotificationPayload(data: unknown): ValidationResult {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid notification data'] }
  }

  const notif = data as Record<string, unknown>

  if (typeof notif.title !== 'string' || notif.title.length === 0 || notif.title.length > 200) {
    errors.push('Title must be 1-200 characters')
  }

  if (notif.body !== undefined && (typeof notif.body !== 'string' || notif.body.length > 1000)) {
    errors.push('Body must be under 1000 characters')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate base64 image data
 */
export function validateBase64Image(data: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof data !== 'string') {
    return { valid: false, errors: ['Image must be a string'] }
  }

  // Check for valid base64 image format
  const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/
  if (!base64Regex.test(data)) {
    errors.push('Invalid image format')
  }

  // Check size (max 10MB)
  const sizeInBytes = (data.length * 3) / 4 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (sizeInBytes > maxSize) {
    errors.push('Image exceeds maximum size of 10MB')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Safely parse JSON with validation
 */
export function safeJSONParse<T>(json: string, validator?: (data: unknown) => ValidationResult): T | null {
  try {
    const parsed = JSON.parse(json)

    if (validator) {
      const result = validator(parsed)
      if (!result.valid) {
        console.error('Validation failed:', result.errors)
        return null
      }
    }

    return parsed as T
  } catch (error) {
    console.error('JSON parse error:', error)
    return null
  }
}
