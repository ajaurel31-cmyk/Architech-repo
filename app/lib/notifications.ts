/**
 * Local notification scheduling for GoutGuard.
 *
 * Uses @capacitor/local-notifications on native platforms and falls back
 * to the Web Notifications API on the web.
 */

import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapacitorLocalNotification {
  id: number;
  title: string;
  body: string;
  schedule?: {
    at?: Date;
    every?:
      | 'year'
      | 'month'
      | 'two-weeks'
      | 'week'
      | 'day'
      | 'hour'
      | 'minute'
      | 'second';
    on?: { hour?: number; minute?: number };
    repeats?: boolean;
  };
  smallIcon?: string;
  sound?: string;
}

interface LocalNotificationsPlugin {
  requestPermissions(): Promise<{ display: string }>;
  checkPermissions(): Promise<{ display: string }>;
  schedule(options: { notifications: CapacitorLocalNotification[] }): Promise<unknown>;
  getPending(): Promise<{ notifications: Array<{ id: number }> }>;
  cancel(options: { notifications: Array<{ id: number }> }): Promise<void>;
}

interface MedicationForReminder {
  id: string;
  name: string;
  times: string[];
}

// ---------------------------------------------------------------------------
// Constants — notification ID ranges to avoid collisions
// ---------------------------------------------------------------------------

const WATER_REMINDER_BASE = 10000;
const MEDICATION_REMINDER_BASE = 20000;
const DAILY_SUMMARY_ID = 30000;

// ---------------------------------------------------------------------------
// Plugin loader
// ---------------------------------------------------------------------------

async function getLocalNotifications(): Promise<LocalNotificationsPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications as unknown as LocalNotificationsPlugin;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

export async function requestNotificationPermission(): Promise<boolean> {
  const plugin = await getLocalNotifications();
  if (plugin) {
    const result = await plugin.requestPermissions();
    return result.display === 'granted';
  }

  // Web fallback
  if (typeof Notification !== 'undefined') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function hasNotificationPermission(): Promise<boolean> {
  const plugin = await getLocalNotifications();
  if (plugin) {
    const result = await plugin.checkPermissions();
    return result.display === 'granted';
  }

  if (typeof Notification !== 'undefined') {
    return Notification.permission === 'granted';
  }

  return false;
}

// ---------------------------------------------------------------------------
// Water reminders
// ---------------------------------------------------------------------------

export async function scheduleWaterReminders(frequency: string): Promise<boolean> {
  const plugin = await getLocalNotifications();
  if (!plugin) {
    saveWebWaterReminder(frequency);
    return true;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  // Cancel existing water reminders
  await cancelWaterReminders();

  // Parse frequency: '1h', '2h', '3h'
  const hours = parseInt(frequency.replace('h', ''), 10) || 2;

  // Schedule reminders between 8 AM and 9 PM
  const notifications: CapacitorLocalNotification[] = [];
  const messages = [
    'Time to hydrate! Water helps flush uric acid.',
    'Stay on track with your water goal today!',
    'Drink some water — hydration is key for gout management.',
    'Water break! Staying hydrated helps lower uric acid levels.',
  ];

  for (let hour = 8; hour <= 21; hour += hours) {
    const id = WATER_REMINDER_BASE + hour;
    notifications.push({
      id,
      title: 'GoutGuard Water Reminder',
      body: messages[Math.floor(Math.random() * messages.length)],
      schedule: {
        on: { hour, minute: 0 },
        every: 'day',
        repeats: true,
      },
    });
  }

  await plugin.schedule({ notifications });
  return true;
}

export async function cancelWaterReminders(): Promise<void> {
  const plugin = await getLocalNotifications();
  if (!plugin) {
    clearWebWaterReminder();
    return;
  }

  const pending = await plugin.getPending();
  const waterIds = pending.notifications
    .filter((n) => n.id >= WATER_REMINDER_BASE && n.id < MEDICATION_REMINDER_BASE)
    .map((n) => ({ id: n.id }));

  if (waterIds.length > 0) {
    await plugin.cancel({ notifications: waterIds });
  }
}

// ---------------------------------------------------------------------------
// Medication reminders
// ---------------------------------------------------------------------------

export async function scheduleMedicationReminders(
  medications: MedicationForReminder[],
): Promise<boolean> {
  const plugin = await getLocalNotifications();
  if (!plugin) return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  // Cancel existing medication reminders
  await cancelMedicationReminders();

  const notifications: CapacitorLocalNotification[] = [];
  let idx = 0;

  for (const med of medications) {
    for (const time of med.times) {
      const [hourStr, minuteStr] = time.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      if (isNaN(hour) || isNaN(minute)) continue;

      notifications.push({
        id: MEDICATION_REMINDER_BASE + idx,
        title: `Time to take ${med.name}`,
        body: `It's time for your scheduled dose of ${med.name}.`,
        schedule: {
          on: { hour, minute },
          every: 'day',
          repeats: true,
        },
      });
      idx++;
    }
  }

  if (notifications.length > 0) {
    await plugin.schedule({ notifications });
  }
  return true;
}

export async function cancelMedicationReminders(): Promise<void> {
  const plugin = await getLocalNotifications();
  if (!plugin) return;

  const pending = await plugin.getPending();
  const medIds = pending.notifications
    .filter((n) => n.id >= MEDICATION_REMINDER_BASE && n.id < DAILY_SUMMARY_ID)
    .map((n) => ({ id: n.id }));

  if (medIds.length > 0) {
    await plugin.cancel({ notifications: medIds });
  }
}

// ---------------------------------------------------------------------------
// Daily summary
// ---------------------------------------------------------------------------

export async function scheduleDailySummary(): Promise<boolean> {
  const plugin = await getLocalNotifications();
  if (!plugin) return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await cancelDailySummary();

  await plugin.schedule({
    notifications: [
      {
        id: DAILY_SUMMARY_ID,
        title: 'GoutGuard Daily Summary',
        body: 'Check your daily progress — purine intake, water, and medications.',
        schedule: {
          on: { hour: 20, minute: 0 },
          every: 'day',
          repeats: true,
        },
      },
    ],
  });
  return true;
}

export async function cancelDailySummary(): Promise<void> {
  const plugin = await getLocalNotifications();
  if (!plugin) return;

  const pending = await plugin.getPending();
  const summaryIds = pending.notifications
    .filter((n) => n.id === DAILY_SUMMARY_ID)
    .map((n) => ({ id: n.id }));

  if (summaryIds.length > 0) {
    await plugin.cancel({ notifications: summaryIds });
  }
}

// ---------------------------------------------------------------------------
// Cancel all
// ---------------------------------------------------------------------------

export async function cancelAllNotifications(): Promise<void> {
  await cancelWaterReminders();
  await cancelMedicationReminders();
  await cancelDailySummary();
}

// ---------------------------------------------------------------------------
// Web fallback for water reminders (uses setInterval in-memory)
// Persisted in localStorage so settings page reflects the state.
// ---------------------------------------------------------------------------

let webWaterInterval: ReturnType<typeof setInterval> | null = null;

function saveWebWaterReminder(frequency: string): void {
  try {
    localStorage.setItem('goutguard_water_reminder_freq', frequency);
  } catch {
    // ignore
  }
  startWebWaterReminder(frequency);
}

function clearWebWaterReminder(): void {
  try {
    localStorage.removeItem('goutguard_water_reminder_freq');
  } catch {
    // ignore
  }
  if (webWaterInterval) {
    clearInterval(webWaterInterval);
    webWaterInterval = null;
  }
}

function startWebWaterReminder(frequency: string): void {
  if (webWaterInterval) {
    clearInterval(webWaterInterval);
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  const hours = parseInt(frequency.replace('h', ''), 10) || 2;
  const ms = hours * 60 * 60 * 1000;

  webWaterInterval = setInterval(() => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour <= 21) {
      new Notification('GoutGuard Water Reminder', {
        body: 'Time to hydrate! Water helps flush uric acid.',
        icon: '/icon-192.png',
      });
    }
  }, ms);
}

/**
 * Initialize web water reminders on page load if they were previously enabled.
 */
export function initWebNotifications(): void {
  try {
    const freq = localStorage.getItem('goutguard_water_reminder_freq');
    if (freq) {
      startWebWaterReminder(freq);
    }
  } catch {
    // ignore
  }
}
