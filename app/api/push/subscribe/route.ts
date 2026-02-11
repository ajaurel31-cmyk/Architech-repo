import { NextResponse } from 'next/server';
import { validatePushSubscription } from '@/app/lib/validation';

// In-memory store for push subscriptions (use a database in production)
const subscriptions = new Map<string, unknown>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validatePushSubscription(body);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const sub = body as { endpoint: string };
    subscriptions.set(sub.endpoint, body);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save subscription.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (typeof endpoint === 'string') {
      subscriptions.delete(endpoint);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to remove subscription.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ count: subscriptions.size });
}
