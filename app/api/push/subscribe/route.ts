import { NextRequest, NextResponse } from 'next/server'
import { saveSubscription, removeSubscription, getVapidPublicKey, isConfigured } from '@/app/lib/push-notifications'

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

    // Use a user ID or generate one from subscription endpoint
    const id = userId || generateIdFromEndpoint(subscription.endpoint)

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

    const id = userId || generateIdFromEndpoint(endpoint)
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

function generateIdFromEndpoint(endpoint: string): string {
  // Create a simple hash from the endpoint URL
  let hash = 0
  for (let i = 0; i < endpoint.length; i++) {
    const char = endpoint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `user_${Math.abs(hash)}`
}
