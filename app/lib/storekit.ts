import { Capacitor } from '@capacitor/core'

// Declare the global CdvPurchase namespace (injected by cordova-plugin-purchase at runtime)
declare global {
  const CdvPurchase: {
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
      when: () => {
        productUpdated: (callback: () => void) => ReturnType<typeof CdvPurchase.store.when>
        approved: (callback: (transaction: { products: unknown[]; verify: () => void }) => void) => ReturnType<typeof CdvPurchase.store.when>
        verified: (callback: (receipt: { collection: Array<{ id: string }>; finish: () => void }) => void) => ReturnType<typeof CdvPurchase.store.when>
        finished: (callback: (transaction: unknown) => void) => ReturnType<typeof CdvPurchase.store.when>
      }
    }
    ProductType: {
      NON_CONSUMABLE: string
    }
    Platform: {
      APPLE_APPSTORE: string
    }
  }
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

/**
 * Initialize StoreKit - call once on app startup
 */
export async function initializeStoreKit(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('StoreKit: Running in web mode, skipping initialization')
    return
  }

  if (isInitialized) {
    return
  }

  // Check if CdvPurchase is available (injected by the Cordova plugin)
  if (typeof CdvPurchase === 'undefined') {
    console.error('StoreKit: CdvPurchase not available')
    return
  }

  try {
    const store = CdvPurchase.store

    // Register products
    store.register([
      {
        id: PRODUCT_IDS.HEALTH_VITALS,
        type: CdvPurchase.ProductType.NON_CONSUMABLE,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
      {
        id: PRODUCT_IDS.MEAL_RECOMMENDATIONS,
        type: CdvPurchase.ProductType.NON_CONSUMABLE,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
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
    await store.initialize([CdvPurchase.Platform.APPLE_APPSTORE])
    await store.update()

    isInitialized = true
    console.log('StoreKit initialized successfully')
  } catch (error) {
    console.error('Failed to initialize StoreKit:', error)
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

  if (!Capacitor.isNativePlatform() || typeof CdvPurchase === 'undefined') {
    return false
  }

  try {
    const product = CdvPurchase.store.get(productId)
    return product?.owned ?? false
  } catch (error) {
    console.error('Failed to check entitlement:', error)
    return false
  }
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

  if (typeof CdvPurchase === 'undefined') {
    return { success: false, error: 'Store not initialized' }
  }

  try {
    const store = CdvPurchase.store
    const product = store.get(productId)
    if (!product) {
      return { success: false, error: 'Product not found' }
    }

    const offer = product.getOffer()
    if (!offer) {
      return { success: false, error: 'No offer available' }
    }

    // Initiate purchase - the result comes through the event handlers
    const result = await store.order(offer)

    if (result && result.isError) {
      return { success: false, error: result.message || 'Purchase failed' }
    }

    // Give time for the purchase flow to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check if purchase was successful
    const isOwned = localStorage.getItem(storageKey) === 'true'
    return { success: isOwned }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Purchase failed'
    console.error('Purchase failed:', error)
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
  if (!Capacitor.isNativePlatform() || typeof CdvPurchase === 'undefined') {
    // For web, check localStorage
    if (typeof window !== 'undefined') {
      const hasVitals = localStorage.getItem(STORAGE_KEYS.HEALTH_VITALS) === 'true'
      const hasMeals = localStorage.getItem(STORAGE_KEYS.MEAL_RECOMMENDATIONS) === 'true'
      return { success: true, hasHealthVitals: hasVitals, hasMealRecommendations: hasMeals }
    }
    return { success: false, hasHealthVitals: false, hasMealRecommendations: false, error: 'Not available' }
  }

  try {
    await CdvPurchase.store.restorePurchases()

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
