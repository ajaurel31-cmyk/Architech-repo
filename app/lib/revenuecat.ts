import { Capacitor } from '@capacitor/core'

// RevenueCat Product IDs
export const PRODUCT_IDS = {
  HEALTH_VITALS: 'health_vitals_499', // Create this in App Store Connect
}

// Entitlement IDs (what user gets access to)
export const ENTITLEMENTS = {
  HEALTH_VITALS: 'health_vitals',
}

// RevenueCat configuration
// Replace with your actual API key from RevenueCat dashboard
const REVENUECAT_API_KEY = 'YOUR_REVENUECAT_API_KEY'

let purchasesInstance: typeof import('@revenuecat/purchases-capacitor').Purchases | null = null

/**
 * Initialize RevenueCat - call this once on app startup
 */
export async function initializeRevenueCat(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('RevenueCat: Running in web mode, skipping initialization')
    return
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    purchasesInstance = Purchases

    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    })

    console.log('RevenueCat initialized successfully')
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error)
  }
}

/**
 * Check if user has an active entitlement
 */
export async function checkEntitlement(entitlementId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !purchasesInstance) {
    // For web testing, check localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`entitlement_${entitlementId}`)
      return stored === 'true'
    }
    return false
  }

  try {
    const { customerInfo } = await purchasesInstance.getCustomerInfo()
    return customerInfo.entitlements.active[entitlementId] !== undefined
  } catch (error) {
    console.error('Failed to check entitlement:', error)
    return false
  }
}

/**
 * Get available packages/offerings
 */
export async function getOfferings() {
  if (!Capacitor.isNativePlatform() || !purchasesInstance) {
    return null
  }

  try {
    const offerings = await purchasesInstance.getOfferings()
    return offerings
  } catch (error) {
    console.error('Failed to get offerings:', error)
    return null
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(packageToPurchase: unknown): Promise<{
  success: boolean
  customerInfo?: unknown
  error?: string
}> {
  if (!Capacitor.isNativePlatform() || !purchasesInstance) {
    // Simulate purchase for web testing
    return { success: true }
  }

  try {
    const { customerInfo } = await purchasesInstance.purchasePackage({
      aPackage: packageToPurchase as never,
    })
    return { success: true, customerInfo }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Purchase failed'
    console.error('Purchase failed:', error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Purchase Health Vitals feature
 */
export async function purchaseHealthVitals(): Promise<{
  success: boolean
  error?: string
}> {
  if (!Capacitor.isNativePlatform()) {
    // Simulate purchase for web/testing
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Unlock Health Vitals tracking for $4.99?\n\n(This will enable blood pressure and glucose logging with charts and reminders)'
      )
      if (confirmed) {
        localStorage.setItem(`entitlement_${ENTITLEMENTS.HEALTH_VITALS}`, 'true')
        return { success: true }
      }
      return { success: false, error: 'User cancelled' }
    }
    return { success: false, error: 'Not available' }
  }

  try {
    const offerings = await getOfferings()

    if (!offerings?.current?.availablePackages?.length) {
      return { success: false, error: 'No packages available' }
    }

    // Find the health vitals package or use the first available
    const healthVitalsPackage = offerings.current.availablePackages.find(
      (pkg) => pkg.product.identifier === PRODUCT_IDS.HEALTH_VITALS
    ) || offerings.current.availablePackages[0]

    const result = await purchasePackage(healthVitalsPackage)
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Purchase failed'
    return { success: false, error: errorMessage }
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean
  hasHealthVitals: boolean
  error?: string
}> {
  if (!Capacitor.isNativePlatform() || !purchasesInstance) {
    // For web, check localStorage
    if (typeof window !== 'undefined') {
      const hasVitals = localStorage.getItem(`entitlement_${ENTITLEMENTS.HEALTH_VITALS}`) === 'true'
      return { success: true, hasHealthVitals: hasVitals }
    }
    return { success: false, hasHealthVitals: false, error: 'Not available' }
  }

  try {
    const { customerInfo } = await purchasesInstance.restorePurchases()
    const hasHealthVitals = customerInfo.entitlements.active[ENTITLEMENTS.HEALTH_VITALS] !== undefined
    return { success: true, hasHealthVitals }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Restore failed'
    console.error('Restore failed:', error)
    return { success: false, hasHealthVitals: false, error: errorMessage }
  }
}

/**
 * Check if Health Vitals is unlocked
 */
export async function isHealthVitalsUnlocked(): Promise<boolean> {
  return checkEntitlement(ENTITLEMENTS.HEALTH_VITALS)
}
