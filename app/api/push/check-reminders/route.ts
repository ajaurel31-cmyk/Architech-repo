import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint is called by the service worker to check for due reminders.
  // In a production app, this would query a database for reminders that are due.
  // Since GoutGuard stores data locally on-device, reminder checking happens
  // client-side via the service worker and local notifications.
  return NextResponse.json({
    reminders: [],
    message: 'Reminders are managed locally on device.',
  });
}
