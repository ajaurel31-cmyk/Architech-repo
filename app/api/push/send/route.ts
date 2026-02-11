import { NextResponse } from 'next/server';
import { validateNotificationPayload, sanitizeString } from '@/app/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateNotificationPayload(body);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { title, body: notifBody } = body;

    const sanitizedTitle = sanitizeString(title);
    const sanitizedBody = notifBody ? sanitizeString(notifBody) : undefined;

    // In production, send via web-push library to subscribed clients
    return NextResponse.json({
      success: true,
      message: 'Notification queued',
      notification: { title: sanitizedTitle, body: sanitizedBody },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to send notification.' },
      { status: 500 }
    );
  }
}
