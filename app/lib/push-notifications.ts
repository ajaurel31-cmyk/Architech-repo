import webPush, { PushSubscription } from 'web-push'

// In production, store VAPID keys in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:support@transplantfood.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

// In-memory store for subscriptions (use a database in production)
const subscriptions = new Map<string, PushSubscription>()

export function saveSubscription(userId: string, subscription: PushSubscription): void {
  subscriptions.set(userId, subscription)
}

export function getSubscription(userId: string): PushSubscription | undefined {
  return subscriptions.get(userId)
}

export function removeSubscription(userId: string): void {
  subscriptions.delete(userId)
}

export function getAllSubscriptions(): Map<string, PushSubscription> {
  return subscriptions
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('VAPID keys not configured')
    return false
  }

  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload))
    return true
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

export function isConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}
