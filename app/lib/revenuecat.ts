import { Capacitor } from '@capacitor/core'

// RevenueCat Product IDs - create these in App Store Connect
export const PRODUCT_IDS = {
  HEALTH_VITALS: 'health_vitals_499',
  MEAL_RECOMMENDATIONS: 'meal_recommendations_499',
}

// Entitlement IDs - create these in RevenueCat dashboard
export const ENTITLEMENTS = {
  HEALTH_VITALS: 'health_vitals',
  MEAL_RECOMMENDATIONS: 'meal_recommendations',
}

// RevenueCat API Key - replace with production key before App Store release
const REVENUECAT_API_KEY = 'test_ZknkEvykdoVnYDSvXfxfgypKUXs'

let purchasesInstance: typeof import('@revenuecat/purchases-capacitor').Purchases | null = null

/**
 * Initialize RevenueCat - call once on app startup
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
 * Purchase a specific product by ID
 */
async function purchaseProduct(productId: string, entitlementId: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!Capacitor.isNativePlatform()) {
    // Simulate purchase for web/testing
    if (typeof window !== 'undefined') {
      const price = productId.includes('499') ? '$4.99' : '$1.99'
      const productName = productId.includes('vitals') ? 'Health Vitals' : 'Meal Recommendations'
      const confirmed = window.confirm(
        `Unlock ${productName} for ${price}?\n\n(This is a one-time purchase)`
      )
      if (confirmed) {
        localStorage.setItem(`entitlement_${entitlementId}`, 'true')
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

    // Find the specific package
    const pkg = offerings.current.availablePackages.find(
      (p) => p.product.identifier === productId
    ) || offerings.current.availablePackages[0]

    const { customerInfo } = await purchasesInstance!.purchasePackage({
      aPackage: pkg as never,
    })

    const hasEntitlement = customerInfo.entitlements.active[entitlementId] !== undefined
    return { success: hasEntitlement }
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
  return purchaseProduct(PRODUCT_IDS.HEALTH_VITALS, ENTITLEMENTS.HEALTH_VITALS)
}

/**
 * Purchase Meal Recommendations feature
 */
export async function purchaseMealRecommendations(): Promise<{ success: boolean; error?: string }> {
  return purchaseProduct(PRODUCT_IDS.MEAL_RECOMMENDATIONS, ENTITLEMENTS.MEAL_RECOMMENDATIONS)
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
  if (!Capacitor.isNativePlatform() || !purchasesInstance) {
    // For web, check localStorage
    if (typeof window !== 'undefined') {
      const hasVitals = localStorage.getItem(`entitlement_${ENTITLEMENTS.HEALTH_VITALS}`) === 'true'
      const hasMeals = localStorage.getItem(`entitlement_${ENTITLEMENTS.MEAL_RECOMMENDATIONS}`) === 'true'
      return { success: true, hasHealthVitals: hasVitals, hasMealRecommendations: hasMeals }
    }
    return { success: false, hasHealthVitals: false, hasMealRecommendations: false, error: 'Not available' }
  }

  try {
    const { customerInfo } = await purchasesInstance.restorePurchases()
    const hasHealthVitals = customerInfo.entitlements.active[ENTITLEMENTS.HEALTH_VITALS] !== undefined
    const hasMealRecommendations = customerInfo.entitlements.active[ENTITLEMENTS.MEAL_RECOMMENDATIONS] !== undefined
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
  return checkEntitlement(ENTITLEMENTS.HEALTH_VITALS)
}

/**
 * Check if Meal Recommendations is unlocked
 */
export async function isMealRecommendationsUnlocked(): Promise<boolean> {
  return checkEntitlement(ENTITLEMENTS.MEAL_RECOMMENDATIONS)
}
