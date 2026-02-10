import { Capacitor } from '@capacitor/core'
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases'

// Product IDs - create these in App Store Connect
export const PRODUCT_IDS = {
  HEALTH_VITALS: 'health_vitals_499',
  MEAL_RECOMMENDATIONS: 'meal_recommendations_499',
}

// Storage keys for tracking purchases
const STORAGE_KEYS = {
  HEALTH_VITALS: 'entitlement_health_vitals',
  MEAL_RECOMMENDATIONS: 'entitlement_meal_recommendations',
}

let isInitialized = false
let initializationPromise: Promise<boolean> | null = null
let lastInitError: string | null = null

/**
 * Initialize StoreKit - call once on app startup
 * Returns true if initialization was successful
 */
export async function initializeStoreKit(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false
  }

  if (isInitialized) {
    return true
  }

  // If already initializing, wait for that to complete
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = doInitializeStoreKit()
  const result = await initializationPromise

  // Reset promise if failed so we can retry later
  if (!result) {
    initializationPromise = null
  }

  return result
}

async function doInitializeStoreKit(): Promise<boolean> {
  try {
    const { isBillingSupported } = await NativePurchases.isBillingSupported()

    if (!isBillingSupported) {
      lastInitError = 'In-app purchases are not supported on this device.'
      return false
    }

    isInitialized = true
    lastInitError = null
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    lastInitError = `Store initialization failed: ${errorMessage}`
    return false
  }
}

/**
 * Force retry initialization (useful after network recovery)
 */
export async function retryInitializeStoreKit(): Promise<boolean> {
  if (isInitialized) {
    return true
  }

  initializationPromise = null
  lastInitError = null
  return initializeStoreKit()
}

/**
 * Get the last initialization error message
 */
export function getLastInitError(): string | null {
  return lastInitError
}

/**
 * Check if running on native platform (iOS/Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Check if user has an active entitlement
 * Only trusts localStorage on native platform (set after real StoreKit purchase)
 */
export async function checkEntitlement(productId: string): Promise<boolean> {
  // On web, never grant access from localStorage — it can be tampered with
  if (!Capacitor.isNativePlatform()) {
    return false
  }

  const storageKey = productId === PRODUCT_IDS.HEALTH_VITALS
    ? STORAGE_KEYS.HEALTH_VITALS
    : STORAGE_KEYS.MEAL_RECOMMENDATIONS

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'true') {
      return true
    }
  }

  return false
}

/**
 * Check if the device can make purchases
 */
export function canMakePurchases(): boolean {
  if (!Capacitor.isNativePlatform()) {
    return false // Web cannot make purchases — must use native app
  }
  return isInitialized
}

/**
 * Get store availability status for UI display
 */
export function getStoreStatus(): { available: boolean; message: string } {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, message: 'Purchases are only available in the iOS app' }
  }

  if (isInitialized) {
    return { available: true, message: 'Store ready' }
  }

  if (lastInitError) {
    return { available: false, message: lastInitError }
  }

  return { available: false, message: 'Store not initialized yet' }
}

/**
 * Purchase a specific product by ID
 */
async function purchaseProduct(productId: string): Promise<{
  success: boolean
  error?: string
}> {
  const storageKey = productId === PRODUCT_IDS.HEALTH_VITALS
    ? STORAGE_KEYS.HEALTH_VITALS
    : STORAGE_KEYS.MEAL_RECOMMENDATIONS

  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Purchases are only available in the iOS app. Download KidneyCare+ from the App Store.' }
  }

  // Ensure store is initialized before attempting purchase
  if (!isInitialized) {
    const initialized = await initializeStoreKit()
    if (!initialized) {
      const errorMsg = lastInitError || 'Store not available. Please try again.'
      return { success: false, error: errorMsg }
    }
  }

  try {
    await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.INAPP,
      quantity: 1,
    })

    // Purchase succeeded — record entitlement
    localStorage.setItem(storageKey, 'true')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Purchase failed'

    // Handle user cancellation
    if (errorMessage.includes('cancel') || errorMessage.includes('Cancel')) {
      return { success: false, error: 'User cancelled' }
    }

    // Handle payment restrictions
    if (errorMessage.includes('payment') || errorMessage.includes('Payment')) {
      return { success: false, error: 'Purchases are not allowed on this device. Please check your device settings.' }
    }

    // Handle network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return { success: false, error: 'Network error. Please check your internet connection and try again.' }
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Purchase Health Vitals feature
 */
export async function purchaseHealthVitals(): Promise<{ success: boolean; error?: string }> {
  return purchaseProduct(PRODUCT_IDS.HEALTH_VITALS)
}

/**
 * Purchase Meal Recommendations feature
 */
export async function purchaseMealRecommendations(): Promise<{ success: boolean; error?: string }> {
  return purchaseProduct(PRODUCT_IDS.MEAL_RECOMMENDATIONS)
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean
  hasHealthVitals: boolean
  hasMealRecommendations: boolean
  error?: string
}> {
  // On web, restore is not available
  if (!Capacitor.isNativePlatform()) {
    return { success: false, hasHealthVitals: false, hasMealRecommendations: false, error: 'Restore is only available in the iOS app' }
  }

  // Ensure store is initialized
  if (!isInitialized) {
    await initializeStoreKit()
  }

  try {
    await NativePurchases.restorePurchases()

    // After restore, check each product's ownership
    let hasHealthVitals = false
    let hasMealRecommendations = false

    try {
      const vitalsProduct = await NativePurchases.getProduct({
        productIdentifier: PRODUCT_IDS.HEALTH_VITALS,
        productType: PURCHASE_TYPE.INAPP,
      })
      if (vitalsProduct?.product) {
        hasHealthVitals = true
      }
    } catch {
      // Product not owned or not found
    }

    try {
      const mealsProduct = await NativePurchases.getProduct({
        productIdentifier: PRODUCT_IDS.MEAL_RECOMMENDATIONS,
        productType: PURCHASE_TYPE.INAPP,
      })
      if (mealsProduct?.product) {
        hasMealRecommendations = true
      }
    } catch {
      // Product not owned or not found
    }

    // Update localStorage
    if (hasHealthVitals) {
      localStorage.setItem(STORAGE_KEYS.HEALTH_VITALS, 'true')
    }
    if (hasMealRecommendations) {
      localStorage.setItem(STORAGE_KEYS.MEAL_RECOMMENDATIONS, 'true')
    }

    return { success: true, hasHealthVitals, hasMealRecommendations }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Restore failed'
    return { success: false, hasHealthVitals: false, hasMealRecommendations: false, error: errorMessage }
  }
}

/**
 * Check if Health Vitals is unlocked
 */
export async function isHealthVitalsUnlocked(): Promise<boolean> {
  return checkEntitlement(PRODUCT_IDS.HEALTH_VITALS)
}

/**
 * Check if Meal Recommendations is unlocked
 */
export async function isMealRecommendationsUnlocked(): Promise<boolean> {
  return checkEntitlement(PRODUCT_IDS.MEAL_RECOMMENDATIONS)
}

/**
 * Get the localized price string for a product from StoreKit.
 * Returns the store price (e.g. "$4.99", "€4,99") or a fallback.
 */
export async function getProductPrice(productId: string, fallback: string = ''): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    return fallback
  }

  if (!isInitialized) {
    await initializeStoreKit()
  }

  try {
    const { product } = await NativePurchases.getProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.INAPP,
    })

    if (product?.priceString) {
      return product.priceString
    }
    return fallback
  } catch {
    return fallback
  }
}
