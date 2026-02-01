import { NextRequest, NextResponse } from 'next/server'
import { getSubscription, sendPushNotification, isConfigured } from '@/app/lib/push-notifications'
import { validateNotificationPayload, sanitizeString } from '@/app/lib/validation'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'Push notifications not configured on server' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { userId, endpoint, title, body: messageBody, data } = body

    // Validate notification payload
    const validation = validateNotificationPayload({ title, body: messageBody })
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid notification payload', details: validation.errors },
        { status: 400 }
      )
    }

    if (!userId && !endpoint) {
      return NextResponse.json(
        { error: 'Either userId or endpoint is required' },
        { status: 400 }
      )
    }

    // Get subscription by user ID or endpoint hash
    const id = userId || generateSecureIdFromEndpoint(endpoint)
    const subscription = getSubscription(id)

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this user' },
        { status: 404 }
      )
    }

    // Sanitize notification content to prevent XSS
    const sanitizedTitle = sanitizeString(title)
    const sanitizedBody = messageBody ? sanitizeString(messageBody) : ''

    const success = await sendPushNotification(subscription, {
      title: sanitizedTitle,
      body: sanitizedBody,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'medication-reminder',
      data: data || {}
    })

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Notification sent'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

/**
 * Generate a secure hash from the endpoint URL using SHA-256
 */
function generateSecureIdFromEndpoint(endpoint: string): string {
  const hash = crypto.createHash('sha256').update(endpoint).digest('hex')
  return `user_${hash.substring(0, 16)}`
}
