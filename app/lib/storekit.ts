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

// Declare cordova global for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var cordova: {
    require?: (module: string) => unknown
    platformId?: string
  } | undefined
}

/**
 * Try to load CdvPurchase through cordova.require as a fallback
 */
function tryRequireCdvPurchase(): boolean {
  if (typeof window === 'undefined') return false

  // Already available
  if (typeof window.CdvPurchase !== 'undefined') {
    return true
  }

  // Also check for the 'store' global which is clobbered by the plugin
  if (typeof (window as Window & { store?: unknown }).store !== 'undefined') {
    // The store global exists, CdvPurchase should also be available shortly
    if (typeof window.CdvPurchase !== 'undefined') {
      return true
    }
  }

  // Try to load via cordova.require with multiple possible module names
  if (typeof window.cordova !== 'undefined' && window.cordova.require) {
    // The correct module name for cordova-plugin-purchase v13+
    const moduleNames = [
      'cordova-plugin-purchase.CdvPurchase',
      'cordova-plugin-purchase.InAppPurchase',  // Legacy fallback
      'store-kit.CdvPurchase',  // Alternative name
    ]

    for (const moduleName of moduleNames) {
      try {
        const plugin = window.cordova.require(moduleName)
        if (plugin) {
          // After require, CdvPurchase should be clobbered to window
          if (typeof window.CdvPurchase !== 'undefined') {
            return true
          }
          // If CdvPurchase isn't on window yet, the require at least worked
          // so the plugin is available - give it a moment to clobber
          return false
        }
      } catch {
        // Module not found, try next
      }
    }
  }

  return false
}

/**
 * Check if deviceready has likely already fired
 */
function isDeviceReady(): boolean {
  if (typeof window === 'undefined') return false

  // If cordova exists and has platformId, deviceready has fired
  if (typeof window.cordova !== 'undefined' && window.cordova.platformId) {
    return true
  }

  // If document is complete and we're in a native context, it's likely ready
  if (document.readyState === 'complete') {
    return true
  }

  return false
}

/**
 * Force load cordova plugins by executing the plugin bootstrap
 */
function forceLoadCordovaPlugins(): void {
  if (typeof window === 'undefined' || typeof window.cordova === 'undefined') return

  try {
    // Try to trigger the plugin loader if it exists
    const cordovaAny = window.cordova as { plugins?: unknown; pluginLoader?: { load?: () => void } }
    if (cordovaAny.pluginLoader?.load) {
      cordovaAny.pluginLoader.load()
    }
  } catch {
    // Ignore errors from forcing plugin load
  }
}

/**
 * Wait for CdvPurchase to become available (injected after deviceready)
 */
async function waitForCdvPurchase(timeoutMs: number = 10000): Promise<boolean> {
  if (typeof window === 'undefined') return false

  // Already available
  if (typeof window.CdvPurchase !== 'undefined') {
    return true
  }

  // Try cordova.require first
  if (tryRequireCdvPurchase()) {
    return true
  }

  // Try forcing plugin load
  forceLoadCordovaPlugins()

  // Check again after force load
  if (typeof window.CdvPurchase !== 'undefined') {
    return true
  }

  return new Promise((resolve) => {
    const startTime = Date.now()
    let resolved = false
    let deviceReadyReceived = false
    let deviceReadyHandler: (() => void) | null = null

    const cleanup = (result: boolean) => {
      if (resolved) return
      resolved = true
      clearInterval(checkInterval)
      if (deviceReadyHandler) {
        document.removeEventListener('deviceready', deviceReadyHandler)
      }
      resolve(result)
    }

    // Check periodically for CdvPurchase
    const checkInterval = setInterval(() => {
      // Try require on each check as well
      if (typeof window.CdvPurchase !== 'undefined' || tryRequireCdvPurchase()) {
        cleanup(true)
      } else if (Date.now() - startTime > timeoutMs) {
        cleanup(false)
      }
    }, 100)

    // Handle deviceready event
    const onDeviceReady = () => {
      deviceReadyReceived = true

      // Force load plugins after deviceready
      forceLoadCordovaPlugins()

      // Check immediately
      if (typeof window.CdvPurchase !== 'undefined' || tryRequireCdvPurchase()) {
        cleanup(true)
        return
      }

      // Give a longer delay after deviceready for plugin injection
      // Some devices need more time for plugins to initialize
      const delays = [100, 500, 1000, 2000]
      delays.forEach((delay) => {
        setTimeout(() => {
          if (!resolved && (typeof window.CdvPurchase !== 'undefined' || tryRequireCdvPurchase())) {
            cleanup(true)
          }
        }, delay)
      })
    }

    deviceReadyHandler = onDeviceReady

    // If deviceready already fired, trigger the handler immediately
    if (isDeviceReady()) {
      onDeviceReady()
    }

    // Also listen for deviceready event (in case it hasn't fired yet)
    document.addEventListener('deviceready', onDeviceReady, { once: true })
  })
}

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
    // Build diagnostic status
    const cordovaLoaded = typeof window.cordova !== 'undefined'
    const cordovaPlatformId = window.cordova?.platformId
    const storeGlobalExists = typeof (window as Window & { store?: unknown }).store !== 'undefined'

    let statusParts: string[] = []
    if (cordovaLoaded) {
      statusParts.push(`Cordova: ${cordovaPlatformId || 'loaded'}`)
    } else {
      statusParts.push('Cordova: not loaded')
    }
    if (storeGlobalExists) {
      statusParts.push('store global: found')
    }

    const cordovaStatus = statusParts.join(', ')

    // This is expected in iOS Simulator or when plugin isn't synced
    lastInitError = `Purchase plugin not loaded (${cordovaStatus}). This may happen in the iOS Simulator. Try: 1) Restart the app, 2) Reinstall the app, or 3) Run 'npx cap sync' and rebuild.`

    // Retry if we haven't exceeded max attempts (handles slow plugin loading)
    if (initializationAttempts < MAX_INIT_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 2000 * initializationAttempts))
      return doInitializeStoreKit()
    }

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
        // Product updated
      })
      .approved((transaction) => {
        transaction.verify()
      })
      .verified((receipt) => {
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
      .finished(() => {
        // Transaction finished
      })

    // Initialize the store
    await store.initialize([window.CdvPurchase.Platform.APPLE_APPSTORE])
    await store.update()

    isInitialized = true
    lastInitError = null
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    lastInitError = `Store initialization failed: ${errorMessage}`
    if (process.env.NODE_ENV === 'development') console.error('Failed to initialize StoreKit:', error)

    // Retry if we haven't exceeded max attempts
    if (initializationAttempts < MAX_INIT_ATTEMPTS) {
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
    if (process.env.NODE_ENV === 'development') console.error('Failed to check entitlement:', error)
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
    if (process.env.NODE_ENV === 'development') console.error('Purchase failed:', error)

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
    if (process.env.NODE_ENV === 'development') console.error('Restore failed:', error)
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
