import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Minimal type declarations for @capgo/native-purchases
// The package may not ship its own TypeScript definitions, so we declare the
// subset of the API surface that GoutGuard relies on.
// ---------------------------------------------------------------------------

interface NativePurchasesPlugin {
  initialize(options: { apiKey: string }): Promise<void>;
  getOfferings(): Promise<{ offerings: Offering[] }>;
  purchasePackage(options: { identifier: string; offeringIdentifier: string }): Promise<PurchaseResult>;
  restorePurchases(): Promise<CustomerInfo>;
  getCustomerInfo(): Promise<CustomerInfo>;
}

interface Offering {
  identifier: string;
  availablePackages: Package[];
}

interface Package {
  identifier: string;
  product: Product;
  offeringIdentifier: string;
}

interface Product {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
}

interface PurchaseResult {
  customerInfo: CustomerInfo;
}

interface CustomerInfo {
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, EntitlementInfo>;
  };
}

interface EntitlementInfo {
  identifier: string;
  isActive: boolean;
  productIdentifier: string;
  expirationDate: string | null;
}

// ---------------------------------------------------------------------------
// Product identifiers
// ---------------------------------------------------------------------------

export const PRODUCT_IDS = {
  MONTHLY: 'goutguard_monthly_499',
  ANNUAL: 'goutguard_annual_2999',
} as const;

// ---------------------------------------------------------------------------
// Internal constants & state
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'goutguard_premium_active';
const ENTITLEMENT_ID = 'premium';

let storeInitialized = false;
let storeAvailable = false;
let storeMessage = 'Store has not been initialized yet.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Dynamically import the NativePurchases plugin.  We do this at call-time
 * rather than at module-level so the app can still load on the web where the
 * native module is unavailable.
 */
async function getNativePurchases(): Promise<NativePurchasesPlugin> {
  const { NativePurchases } = await import('@capgo/native-purchases');
  return NativePurchases as unknown as NativePurchasesPlugin;
}

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function setPremiumFlag(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage may be unavailable in certain contexts – fail silently.
  }
}

/**
 * Inspect CustomerInfo and determine whether the user has an active premium
 * entitlement.  Updates localStorage accordingly and returns the result.
 */
function processPremiumStatus(customerInfo: CustomerInfo): boolean {
  const hasActiveEntitlement =
    customerInfo.entitlements?.active?.[ENTITLEMENT_ID]?.isActive === true;

  const hasActiveSubscription =
    Array.isArray(customerInfo.activeSubscriptions) &&
    customerInfo.activeSubscriptions.some(
      (id) => id === PRODUCT_IDS.MONTHLY || id === PRODUCT_IDS.ANNUAL,
    );

  const isPremium = hasActiveEntitlement || hasActiveSubscription;
  setPremiumFlag(isPremium);
  return isPremium;
}

function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('cancel')) {
      return 'Purchase was cancelled. No charge was made.';
    }
    if (msg.includes('network') || msg.includes('connection')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (msg.includes('already') && msg.includes('subscribed')) {
      return 'You already have an active subscription.';
    }
    if (msg.includes('not allowed') || msg.includes('unauthorized')) {
      return 'Purchases are not allowed on this device. Please check your device settings.';
    }
    if (msg.includes('product') && msg.includes('not found')) {
      return 'This subscription is temporarily unavailable. Please try again later.';
    }
    if (msg.includes('payment')) {
      return 'There was a problem processing your payment. Please try again or use a different payment method.';
    }

    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Initialize the StoreKit / purchases SDK.
 *
 * Call this once on app startup (e.g. in a top-level useEffect).  On web the
 * function returns `false` immediately without side-effects.  On native it
 * initialises the SDK, fetches offerings, and auto-restores purchases so the
 * premium flag in localStorage is up-to-date.
 */
export async function initializePurchases(): Promise<boolean> {
  if (!isNativePlatform()) {
    storeAvailable = false;
    storeMessage = 'In-app purchases are only available in the native app. Download GoutGuard from the App Store to subscribe.';
    return false;
  }

  try {
    const NativePurchases = await getNativePurchases();

    await NativePurchases.initialize({
      apiKey: '', // Populated at build-time or via environment config
    });

    // Auto-restore: pull the latest entitlement state from the store so
    // localStorage stays in sync even if the user subscribed on another device.
    try {
      const customerInfo = await NativePurchases.getCustomerInfo();
      processPremiumStatus(customerInfo);
    } catch {
      // Non-fatal – we can still sell new subscriptions even if the initial
      // status check fails.
    }

    storeInitialized = true;
    storeAvailable = true;
    storeMessage = 'Store is ready.';
    return true;
  } catch (error) {
    storeAvailable = false;
    storeMessage = `Failed to initialize store: ${friendlyError(error)}`;
    console.error('[GoutGuard StoreKit] Initialization error:', error);
    return false;
  }
}

/**
 * Synchronous check intended for UI rendering (e.g. gating premium features
 * behind a paywall).  Reads from localStorage so it returns instantly.
 */
export function isPremiumActive(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Asynchronous premium check.  On native platforms this verifies the
 * entitlement state with the store, ensuring the local cache is fresh.
 * On web it falls back to localStorage only.
 */
export async function checkPremiumStatus(): Promise<boolean> {
  // Always start with the local flag so the caller gets a value even if the
  // network request below fails.
  const localStatus = isPremiumActive();

  if (!isNativePlatform() || !storeInitialized) {
    return localStatus;
  }

  try {
    const NativePurchases = await getNativePurchases();
    const customerInfo = await NativePurchases.getCustomerInfo();
    return processPremiumStatus(customerInfo);
  } catch (error) {
    console.error('[GoutGuard StoreKit] Error checking premium status:', error);
    return localStatus;
  }
}

/**
 * Purchase the monthly subscription.
 */
export async function purchaseMonthly(): Promise<{ success: boolean; error?: string }> {
  if (!isNativePlatform()) {
    return {
      success: false,
      error: 'In-app purchases are only available in the native app. Please download GoutGuard from the App Store.',
    };
  }

  if (!storeInitialized) {
    return { success: false, error: 'The store is not ready yet. Please try again in a moment.' };
  }

  try {
    const NativePurchases = await getNativePurchases();

    const { offerings } = await NativePurchases.getOfferings();

    const defaultOffering = offerings.find((o) => o.identifier === 'default') ?? offerings[0];

    if (!defaultOffering) {
      return { success: false, error: 'No subscription offerings are available right now. Please try again later.' };
    }

    const monthlyPackage = defaultOffering.availablePackages.find(
      (pkg) => pkg.product.identifier === PRODUCT_IDS.MONTHLY,
    );

    if (!monthlyPackage) {
      return { success: false, error: 'The monthly subscription is temporarily unavailable. Please try again later.' };
    }

    const { customerInfo } = await NativePurchases.purchasePackage({
      identifier: monthlyPackage.identifier,
      offeringIdentifier: defaultOffering.identifier,
    });

    const isPremium = processPremiumStatus(customerInfo);

    return { success: isPremium };
  } catch (error) {
    console.error('[GoutGuard StoreKit] Monthly purchase error:', error);
    return { success: false, error: friendlyError(error) };
  }
}

/**
 * Purchase the annual subscription (includes 7-day free trial).
 */
export async function purchaseAnnual(): Promise<{ success: boolean; error?: string }> {
  if (!isNativePlatform()) {
    return {
      success: false,
      error: 'In-app purchases are only available in the native app. Please download GoutGuard from the App Store.',
    };
  }

  if (!storeInitialized) {
    return { success: false, error: 'The store is not ready yet. Please try again in a moment.' };
  }

  try {
    const NativePurchases = await getNativePurchases();

    const { offerings } = await NativePurchases.getOfferings();

    const defaultOffering = offerings.find((o) => o.identifier === 'default') ?? offerings[0];

    if (!defaultOffering) {
      return { success: false, error: 'No subscription offerings are available right now. Please try again later.' };
    }

    const annualPackage = defaultOffering.availablePackages.find(
      (pkg) => pkg.product.identifier === PRODUCT_IDS.ANNUAL,
    );

    if (!annualPackage) {
      return { success: false, error: 'The annual subscription is temporarily unavailable. Please try again later.' };
    }

    const { customerInfo } = await NativePurchases.purchasePackage({
      identifier: annualPackage.identifier,
      offeringIdentifier: defaultOffering.identifier,
    });

    const isPremium = processPremiumStatus(customerInfo);

    return { success: isPremium };
  } catch (error) {
    console.error('[GoutGuard StoreKit] Annual purchase error:', error);
    return { success: false, error: friendlyError(error) };
  }
}

/**
 * Restore previously purchased subscriptions.  Useful when a user installs the
 * app on a new device or reinstalls after deletion.
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPremium: boolean;
  error?: string;
}> {
  if (!isNativePlatform()) {
    return {
      success: false,
      isPremium: isPremiumActive(),
      error: 'Purchase restoration is only available in the native app.',
    };
  }

  if (!storeInitialized) {
    return {
      success: false,
      isPremium: isPremiumActive(),
      error: 'The store is not ready yet. Please try again in a moment.',
    };
  }

  try {
    const NativePurchases = await getNativePurchases();
    const customerInfo = await NativePurchases.restorePurchases();
    const isPremium = processPremiumStatus(customerInfo);

    return { success: true, isPremium };
  } catch (error) {
    console.error('[GoutGuard StoreKit] Restore error:', error);
    return {
      success: false,
      isPremium: isPremiumActive(),
      error: friendlyError(error),
    };
  }
}

/**
 * Returns `true` when running on a native platform where in-app purchases are
 * supported.  On web this returns `false` — the UI should prompt the user to
 * download the app from the App Store instead.
 */
export function canMakePurchases(): boolean {
  return isNativePlatform();
}

/**
 * Provides a human-readable store status for display in the UI (e.g. settings
 * screen or paywall).
 */
export function getStoreStatus(): { available: boolean; message: string } {
  if (!isNativePlatform()) {
    return {
      available: false,
      message: 'In-app purchases are only available in the native app. Download GoutGuard from the App Store to subscribe.',
    };
  }

  return {
    available: storeAvailable,
    message: storeMessage,
  };
}
