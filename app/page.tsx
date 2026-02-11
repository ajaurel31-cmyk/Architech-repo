'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { initializePurchases } from './lib/storekit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FoodLogEntry {
  food: string;
  purineAmount: number;
  date: string;
}

interface UricAcidReading {
  value: number;
  date: string;
}

interface FlareEntry {
  date: string;
  severity?: string;
  notes?: string;
}

interface WaterLogEntry {
  amount: number;
  date: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isSameDay(dateStr: string): boolean {
  const today = getTodayString();
  // Support both ISO strings and YYYY-MM-DD
  return dateStr.startsWith(today);
}

function daysBetween(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function safeParseJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getPurineColor(current: number): string {
  if (current <= 300) return 'progress-fill-green';
  if (current <= 400) return 'progress-fill-yellow';
  return 'progress-fill-red';
}

function getUricAcidColor(value: number): string {
  if (value < 6.0) return 'stat-value-green';
  if (value < 7.0) return 'stat-value-yellow';
  if (value < 9.0) return 'stat-value-orange';
  return 'stat-value-red';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [dailyPurine, setDailyPurine] = useState(0);
  const [purineTarget] = useState(400);
  const [uricAcid, setUricAcid] = useState<number | null>(null);
  const [daysSinceFlare, setDaysSinceFlare] = useState<number | null>(null);
  const [waterOz, setWaterOz] = useState(0);
  const [recentFoods, setRecentFoods] = useState<FoodLogEntry[]>([]);
  const [greeting, setGreeting] = useState('');
  const [formattedDate, setFormattedDate] = useState('');

  // Load all data from localStorage
  const loadData = useCallback(() => {
    // Greeting & date
    setGreeting(getGreeting());
    setFormattedDate(getFormattedDate());

    // Daily purine log
    const dailyLog = safeParseJSON<FoodLogEntry[]>('goutguard_daily_log', []);
    const todayEntries = dailyLog.filter((entry) => isSameDay(entry.date));
    const totalPurine = todayEntries.reduce((sum, entry) => sum + (entry.purineAmount || 0), 0);
    setDailyPurine(totalPurine);
    setRecentFoods(todayEntries.slice(-5).reverse());

    // Uric acid readings
    const readings = safeParseJSON<UricAcidReading[]>('goutguard_uric_acid_readings', []);
    if (readings.length > 0) {
      const sorted = [...readings].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setUricAcid(sorted[0].value);
    } else {
      setUricAcid(null);
    }

    // Flares
    const flares = safeParseJSON<FlareEntry[]>('goutguard_flares', []);
    if (flares.length > 0) {
      const sorted = [...flares].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setDaysSinceFlare(daysBetween(sorted[0].date));
    } else {
      setDaysSinceFlare(null);
    }

    // Water log
    const waterLog = safeParseJSON<WaterLogEntry[]>('goutguard_water_log', []);
    const todayWater = waterLog
      .filter((entry) => isSameDay(entry.date))
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    setWaterOz(todayWater);
  }, []);

  useEffect(() => {
    loadData();
    initializePurchases().catch(() => {
      // Non-fatal — store initialization failure is handled internally
    });
  }, [loadData]);

  // Add 8oz water
  const addWater = () => {
    const waterLog = safeParseJSON<WaterLogEntry[]>('goutguard_water_log', []);
    waterLog.push({ amount: 8, date: new Date().toISOString() });
    try {
      localStorage.setItem('goutguard_water_log', JSON.stringify(waterLog));
    } catch {
      // Storage full or unavailable
    }
    setWaterOz((prev) => prev + 8);
  };

  const purinePercent = Math.min((dailyPurine / purineTarget) * 100, 100);
  const waterGoalOz = 64;
  const waterPercent = Math.min((waterOz / waterGoalOz) * 100, 100);

  return (
    <div className="container">
      {/* ---- Header ---- */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M16 2L4 8v8c0 7.73 5.12 14.95 12 16 6.88-1.05 12-8.27 12-16V8L16 2z"
                fill="#1a56db"
              />
              <text
                x="16"
                y="21"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                G
              </text>
            </svg>
          </div>
          <span className="header-title">GoutGuard</span>
        </div>
        <Link href="/settings" className="header-settings" aria-label="Settings">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </header>

      {/* ---- Greeting ---- */}
      <section className="greeting">
        <h1 className="greeting-text">{greeting}</h1>
        <p className="greeting-date">{formattedDate}</p>
      </section>

      {/* ---- Daily Purine Summary Card ---- */}
      <section className="card purine-summary-card">
        <h2 className="card-title">Daily Purine Intake</h2>
        <div className="purine-values">
          <span className="purine-current">{dailyPurine}</span>
          <span className="purine-separator"> / </span>
          <span className="purine-target">{purineTarget}mg</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${getPurineColor(dailyPurine)}`}
            style={{ width: `${purinePercent}%` }}
          />
        </div>
        <p className="purine-status">
          {dailyPurine <= 300
            ? 'Great job! Your purine intake is low.'
            : dailyPurine <= 400
              ? 'Approaching your daily limit. Be mindful of high-purine foods.'
              : 'You have exceeded your daily purine target.'}
        </p>
      </section>

      {/* ---- Stats Row ---- */}
      <section className="stats-row">
        <div className="stat-card">
          <span className={`stat-value ${uricAcid !== null ? getUricAcidColor(uricAcid) : ''}`}>
            {uricAcid !== null ? `${uricAcid.toFixed(1)}` : '--'}
          </span>
          <span className="stat-label">Uric Acid (mg/dL)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {daysSinceFlare !== null ? daysSinceFlare : '--'}
          </span>
          <span className="stat-label">Days Since Flare</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{waterOz}oz</span>
          <span className="stat-label">Water Today</span>
        </div>
      </section>

      {/* ---- Quick Action Buttons ---- */}
      <section className="quick-actions">
        <Link href="/scan" className="quick-action-btn quick-action-scan">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>Scan Food</span>
        </Link>
        <Link href="/uric-acid" className="quick-action-btn quick-action-uric">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span>Log Uric Acid</span>
        </Link>
        <Link href="/flares" className="quick-action-btn quick-action-flare">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3.5-7.5-2 3.5 0 6 1.5 7.5 1.14 1.14 2 2.5 2 4.5A4.5 4.5 0 0 1 12.5 18a4.5 4.5 0 0 1-4-3.5z" />
            <path d="M12 22v-2" />
          </svg>
          <span>Log Flare</span>
        </Link>
        <Link href="/water" className="quick-action-btn quick-action-water">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span>Log Water</span>
        </Link>
      </section>

      {/* ---- Daily Water Tracker ---- */}
      <section className="card water-tracker-card">
        <div className="water-tracker-header">
          <h2 className="card-title">Water Tracker</h2>
          <button className="water-add-btn" onClick={addWater} type="button">
            + 8oz
          </button>
        </div>
        <div className="water-tracker-stats">
          <span className="water-current">{waterOz}oz</span>
          <span className="water-separator"> / </span>
          <span className="water-goal">{waterGoalOz}oz</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill progress-fill-cyan"
            style={{ width: `${waterPercent}%` }}
          />
        </div>
      </section>

      {/* ---- Recent Food Log ---- */}
      <section className="card recent-food-card">
        <h2 className="card-title">Recent Food Log</h2>
        {recentFoods.length === 0 ? (
          <p className="empty-state">No foods logged today. Scan or search to add items.</p>
        ) : (
          <ul className="food-log-list">
            {recentFoods.map((entry, idx) => (
              <li key={`${entry.food}-${idx}`} className="food-log-item">
                <span className="food-log-name">{entry.food}</span>
                <span className="food-log-purine">{entry.purineAmount}mg</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Medical Disclaimer ---- */}
      <div className="disclaimer-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>This app is not a substitute for medical advice.</span>
      </div>

      {/* ---- Bottom Navigation Bar ---- */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item active">
          <svg className="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="nav-label">Home</span>
        </Link>
        <Link href="/scan" className="nav-item">
          <svg className="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="nav-label">Scan</span>
        </Link>
        <Link href="/database" className="nav-item">
          <svg className="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span className="nav-label">Database</span>
        </Link>
        <Link href="/uric-acid" className="nav-item">
          <svg className="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="nav-label">Track</span>
        </Link>
        <Link href="/settings" className="nav-item">
          <svg className="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="nav-label">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
