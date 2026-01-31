import { NextRequest, NextResponse } from 'next/server'
import { getSubscription, sendPushNotification, isConfigured } from '@/app/lib/push-notifications'

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

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Get subscription by user ID or endpoint hash
    const id = userId || generateIdFromEndpoint(endpoint)
    const subscription = getSubscription(id)

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this user' },
        { status: 404 }
      )
    }

    const success = await sendPushNotification(subscription, {
      title,
      body: messageBody || '',
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

function generateIdFromEndpoint(endpoint: string): string {
  let hash = 0
  for (let i = 0; i < endpoint.length; i++) {
    const char = endpoint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `user_${Math.abs(hash)}`
}
