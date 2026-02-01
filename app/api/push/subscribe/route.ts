import { NextRequest, NextResponse } from 'next/server'
import { saveSubscription, removeSubscription, getVapidPublicKey, isConfigured } from '@/app/lib/push-notifications'
import { validatePushSubscription } from '@/app/lib/validation'
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
    const { subscription, userId } = body

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription is required' },
        { status: 400 }
      )
    }

    // Validate subscription structure
    const validation = validatePushSubscription(subscription)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid subscription format', details: validation.errors },
        { status: 400 }
      )
    }

    // Use a user ID or generate one from subscription endpoint using secure hash
    const id = userId || generateSecureIdFromEndpoint(subscription.endpoint)

    saveSubscription(id, subscription)

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully'
    })
  } catch (error) {
    console.error('Error saving subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, endpoint } = body

    if (!userId && !endpoint) {
      return NextResponse.json(
        { error: 'Either userId or endpoint is required' },
        { status: 400 }
      )
    }

    const id = userId || generateSecureIdFromEndpoint(endpoint)
    removeSubscription(id)

    return NextResponse.json({
      success: true,
      message: 'Subscription removed'
    })
  } catch (error) {
    console.error('Error removing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Push notifications not configured', configured: false },
      { status: 503 }
    )
  }

  return NextResponse.json({
    vapidPublicKey: getVapidPublicKey(),
    configured: true
  })
}

/**
 * Generate a secure hash from the endpoint URL using SHA-256
 */
function generateSecureIdFromEndpoint(endpoint: string): string {
  const hash = crypto.createHash('sha256').update(endpoint).digest('hex')
  return `user_${hash.substring(0, 16)}`
}
