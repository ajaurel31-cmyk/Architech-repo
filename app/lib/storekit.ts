import { Capacitor } from '@capacitor/core'

// Type for the chainable when() callbacks
interface StoreWhenChain {
  productUpdated: (callback: () => void) => StoreWhenChain
  approved: (callback: (transaction: { products: unknown[]; verify: () => void }) => void) => StoreWhenChain
  verified: (callback: (receipt: { collection: Array<{ id: string }>; finish: () => void }) => void) => StoreWhenChain
  finished: (callback: (transaction: unknown) => void) => StoreWhenChain
}

// Declare the global CdvPurchase namespace (injected by cordova-plugin-purchase at runtime)
declare global {
  // eslint-disable-next-line no-var
  var CdvPurchase: {
    store: {
      register: (products: Array<{
        id: string
        type: string
        platform: string
      }>) => void
      initialize: (platforms: string[]) => Promise<void>
      update: () => Promise<void>
      get: (productId: string) => {
        owned: boolean
        getOffer: () => { id: string } | undefined
      } | undefined
      order: (offer: { id: string }) => Promise<{ isError?: boolean; message?: string } | undefined>
      restorePurchases: () => Promise<void>
      when: () => StoreWhenChain
    }
    ProductType: {
      NON_CONSUMABLE: string
    }
    Platform: {
      APPLE_APPSTORE: string
    }
  } | undefined
}

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
let initializationAttempts = 0
const MAX_INIT_ATTEMPTS = 3
let lastInitError: string | null = null

/**
 * Wait for CdvPurchase to become available (injected after deviceready)
 */
async function waitForCdvPurchase(timeoutMs: number = 10000): Promise<boolean> {
  if (typeof window === 'undefined') return false

  // Already available
  if (typeof window.CdvPurchase !== 'undefined') {
    return true
  }

  return new Promise((resolve) => {
    const startTime = Date.now()

    // Check periodically for CdvPurchase
    const checkInterval = setInterval(() => {
      if (typeof window.CdvPurchase !== 'undefined') {
        clearInterval(checkInterval)
        resolve(true)
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval)
        console.log('StoreKit: CdvPurchase not available after timeout')
        resolve(false)
      }
    }, 100)

    // Also listen for deviceready as a fallback
    document.addEventListener('deviceready', () => {
      // Give a small delay after deviceready for plugin injection
      setTimeout(() => {
        if (typeof window.CdvPurchase !== 'undefined') {
          clearInterval(checkInterval)
          resolve(true)
        }
      }, 500)
    }, { once: true })
  })
}

/**
 * Initialize StoreKit - call once on app startup
 * Returns true if initialization was successful
 */
export async function initializeStoreKit(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('StoreKit: Running in web mode, skipping initialization')
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

/**
 * Force retry initialization (useful after network recovery)
 */
export async function retryInitializeStoreKit(): Promise<boolean> {
  if (isInitialized) {
    return true
  }

  // Reset state and try again
  initializationPromise = null
  initializationAttempts = 0
  lastInitError = null

  return initializeStoreKit()
}

/**
 * Get the last initialization error message
 */
export function getLastInitError(): string | null {
  return lastInitError
}

async function doInitializeStoreKit(): Promise<boolean> {
  initializationAttempts++

  // Wait for CdvPurchase to be injected by the Cordova plugin
  // Use longer timeout on first attempt
  const timeout = initializationAttempts === 1 ? 10000 : 5000
  const isAvailable = await waitForCdvPurchase(timeout)

  if (!isAvailable || typeof window.CdvPurchase === 'undefined') {
    // This is expected in iOS Simulator or when plugin isn't synced
    lastInitError = 'Purchase plugin not loaded. This may happen in the iOS Simulator or if the app needs to be reinstalled.'
    console.log('StoreKit: Plugin not available (expected in Simulator)')
    return false
  }

  try {
    const store = window.CdvPurchase.store

    // Register products
    store.register([
      {
        id: PRODUCT_IDS.HEALTH_VITALS,
        type: window.CdvPurchase.ProductType.NON_CONSUMABLE,
        platform: window.CdvPurchase.Platform.APPLE_APPSTORE,
      },
      {
        id: PRODUCT_IDS.MEAL_RECOMMENDATIONS,
        type: window.CdvPurchase.ProductType.NON_CONSUMABLE,
        platform: window.CdvPurchase.Platform.APPLE_APPSTORE,
      },
    ])

    // Handle verified purchases
    store.when()
      .productUpdated(() => {
        console.log('StoreKit: Products updated')
      })
      .approved((transaction) => {
        console.log('StoreKit: Purchase approved', transaction.products)
        transaction.verify()
      })
      .verified((receipt) => {
        console.log('StoreKit: Purchase verified', receipt)
        // Mark entitlements as owned
        receipt.collection.forEach((product) => {
          if (product.id === PRODUCT_IDS.HEALTH_VITALS) {
            localStorage.setItem(STORAGE_KEYS.HEALTH_VITALS, 'true')
          }
          if (product.id === PRODUCT_IDS.MEAL_RECOMMENDATIONS) {
            localStorage.setItem(STORAGE_KEYS.MEAL_RECOMMENDATIONS, 'true')
          }
        })
        receipt.finish()
      })
      .finished((transaction) => {
        console.log('StoreKit: Transaction finished', transaction)
      })

    // Initialize the store
    await store.initialize([window.CdvPurchase.Platform.APPLE_APPSTORE])
    await store.update()

    isInitialized = true
    lastInitError = null
    console.log('StoreKit initialized successfully')
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    lastInitError = `Store initialization failed: ${errorMessage}`
    console.error('Failed to initialize StoreKit:', error)

    // Retry if we haven't exceeded max attempts
    if (initializationAttempts < MAX_INIT_ATTEMPTS) {
      console.log(`StoreKit: Retrying initialization (attempt ${initializationAttempts + 1}/${MAX_INIT_ATTEMPTS})`)
      await new Promise(resolve => setTimeout(resolve, 1000 * initializationAttempts))
      return doInitializeStoreKit()
    }

    return false
  }
}

/**
 * Check if user has an active entitlement
 */
export async function checkEntitlement(productId: string): Promise<boolean> {
  // Always check localStorage first (works for both web and as a cache for native)
  const storageKey = productId === PRODUCT_IDS.HEALTH_VITALS
    ? STORAGE_KEYS.HEALTH_VITALS
    : STORAGE_KEYS.MEAL_RECOMMENDATIONS

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'true') {
      return true
    }
  }

  if (!Capacitor.isNativePlatform() || typeof window === 'undefined' || typeof window.CdvPurchase === 'undefined') {
    return false
  }

  try {
    const product = window.CdvPurchase.store.get(productId)
    return product?.owned ?? false
  } catch (error) {
    console.error('Failed to check entitlement:', error)
    return false
  }
}

/**
 * Check if the device can make purchases
 */
export function canMakePurchases(): boolean {
  if (!Capacitor.isNativePlatform()) {
    return true // Web mode always allows simulated purchases
  }
  // On native, we rely on the store being initialized
  // The native plugin checks canMakePayments during setup
  return isInitialized
}

/**
 * Get store availability status for UI display
 */
export function getStoreStatus(): { available: boolean; message: string } {
  if (!Capacitor.isNativePlatform()) {
    return { available: true, message: 'Web mode - simulated purchases' }
  }

  if (isInitialized) {
    return { available: true, message: 'Store ready' }
  }

  if (lastInitError) {
    return { available: false, message: lastInitError }
  }

  if (initializationAttempts > 0) {
    return { available: false, message: 'Store initialization in progress...' }
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
    // Simulate purchase for web/testing
    if (typeof window !== 'undefined') {
      const price = '$4.99'
      const productName = productId.includes('vitals') ? 'Health Vitals' : 'Meal Recommendations'
      const confirmed = window.confirm(
        `Unlock ${productName} for ${price}?\n\n(This is a one-time purchase)`
      )
      if (confirmed) {
        localStorage.setItem(storageKey, 'true')
        return { success: true }
      }
      return { success: false, error: 'User cancelled' }
    }
    return { success: false, error: 'Not available' }
  }

  // Ensure store is initialized before attempting purchase
  if (!isInitialized) {
    const initialized = await initializeStoreKit()
    if (!initialized) {
      // Provide a more specific error message
      const errorMsg = lastInitError || 'Store not available. Please try again.'
      return { success: false, error: errorMsg }
    }
  }

  if (typeof window === 'undefined' || typeof window.CdvPurchase === 'undefined') {
    return { success: false, error: 'Store not available. Please restart the app and try again.' }
  }

  try {
    const store = window.CdvPurchase.store
    const product = store.get(productId)
    if (!product) {
      // Product not found - could be network issue or products not configured in App Store Connect
      return { success: false, error: 'Product not available. Please check your internet connection and try again.' }
    }

    const offer = product.getOffer()
    if (!offer) {
      return { success: false, error: 'No offer available for this product.' }
    }

    // Initiate purchase - the result comes through the event handlers
    const result = await store.order(offer)

    if (result && result.isError) {
      // Map common StoreKit errors to user-friendly messages
      const errorMessage = result.message || 'Purchase failed'
      if (errorMessage.includes("Can't make payments")) {
        return { success: false, error: 'Purchases are not allowed on this device. Please check your device settings.' }
      }
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
        return { success: false, error: 'User cancelled' }
      }
      return { success: false, error: errorMessage }
    }

    // Give time for the purchase flow to complete
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Check if purchase was successful
    const isOwned = localStorage.getItem(storageKey) === 'true'
    if (!isOwned) {
      // Purchase may still be processing
      return { success: false, error: 'Purchase is being processed. Please wait a moment and check again.' }
    }
    return { success: isOwned }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Purchase failed'
    console.error('Purchase failed:', error)

    // Provide user-friendly error messages
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
  // For web or when plugin not available, check localStorage
  if (!Capacitor.isNativePlatform() || typeof window === 'undefined' || typeof window.CdvPurchase === 'undefined') {
    if (typeof window !== 'undefined') {
      const hasVitals = localStorage.getItem(STORAGE_KEYS.HEALTH_VITALS) === 'true'
      const hasMeals = localStorage.getItem(STORAGE_KEYS.MEAL_RECOMMENDATIONS) === 'true'
      return { success: true, hasHealthVitals: hasVitals, hasMealRecommendations: hasMeals }
    }
    return { success: false, hasHealthVitals: false, hasMealRecommendations: false, error: 'Not available' }
  }

  // Ensure store is initialized
  if (!isInitialized) {
    await initializeStoreKit()
  }

  try {
    await window.CdvPurchase.store.restorePurchases()

    // Give time for restoration to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    const hasHealthVitals = localStorage.getItem(STORAGE_KEYS.HEALTH_VITALS) === 'true'
    const hasMealRecommendations = localStorage.getItem(STORAGE_KEYS.MEAL_RECOMMENDATIONS) === 'true'

    return { success: true, hasHealthVitals, hasMealRecommendations }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Restore failed'
    console.error('Restore failed:', error)
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
