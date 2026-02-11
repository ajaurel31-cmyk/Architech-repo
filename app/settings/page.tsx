'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  isPremiumActive,
  canMakePurchases,
  purchaseMonthly,
  restorePurchases,
} from '@/app/lib/storekit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoutGuardSettings {
  goutStage: string;
  dietaryRestrictions: string[];
  purineTarget: number;
  waterGoal: { amount: number; unit: string };
  notifications: {
    medications: boolean;
    water: boolean;
    waterFrequency: string;
    dailySummary: boolean;
  };
}

interface MedicationEntry {
  name: string;
  dosage?: string;
  time?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'goutguard_settings';

const DEFAULT_SETTINGS: GoutGuardSettings = {
  goutStage: 'Intercritical',
  dietaryRestrictions: [],
  purineTarget: 400,
  waterGoal: { amount: 64, unit: 'oz' },
  notifications: {
    medications: false,
    water: false,
    waterFrequency: '2h',
    dailySummary: false,
  },
};

const GOUT_STAGES = ['Acute', 'Intercritical', 'Chronic Tophaceous'];

const DIETARY_OPTIONS = [
  'None',
  'Vegetarian',
  'Vegan',
  'Dairy-Free',
  'Gluten-Free',
  'Nut-Free',
  'Shellfish Allergy',
];

const WATER_FREQUENCIES = [
  { label: 'Every 1 hour', value: '1h' },
  { label: 'Every 2 hours', value: '2h' },
  { label: 'Every 3 hours', value: '3h' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveSettings(settings: GoutGuardSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<GoutGuardSettings>(DEFAULT_SETTINGS);
  const [medicationCount, setMedicationCount] = useState(0);
  const [premium, setPremium] = useState(false);
  const [canPurchase, setCanPurchase] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Load settings and related data
  const loadData = useCallback(() => {
    const saved = safeParseJSON<GoutGuardSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
    setSettings({
      ...DEFAULT_SETTINGS,
      ...saved,
      waterGoal: { ...DEFAULT_SETTINGS.waterGoal, ...(saved.waterGoal || {}) },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(saved.notifications || {}) },
    });

    const meds = safeParseJSON<MedicationEntry[]>('goutguard_medications', []);
    setMedicationCount(meds.length);

    setPremium(isPremiumActive());
    setCanPurchase(canMakePurchases());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Update a setting field and persist
  const updateSettings = useCallback(
    (partial: Partial<GoutGuardSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  const updateNotifications = useCallback(
    (partial: Partial<GoutGuardSettings['notifications']>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          notifications: { ...prev.notifications, ...partial },
        };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  const updateWaterGoal = useCallback(
    (partial: Partial<GoutGuardSettings['waterGoal']>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          waterGoal: { ...prev.waterGoal, ...partial },
        };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  // Dietary restriction toggling
  const toggleDietaryRestriction = (option: string) => {
    setSettings((prev) => {
      let updated: string[];
      if (option === 'None') {
        updated = prev.dietaryRestrictions.includes('None') ? [] : ['None'];
      } else {
        const withoutNone = prev.dietaryRestrictions.filter((r) => r !== 'None');
        if (withoutNone.includes(option)) {
          updated = withoutNone.filter((r) => r !== option);
        } else {
          updated = [...withoutNone, option];
        }
      }
      const next = { ...prev, dietaryRestrictions: updated };
      saveSettings(next);
      return next;
    });
  };

  // Subscription actions
  const handleUpgrade = async () => {
    if (!canPurchase) {
      showToast('Download from App Store to subscribe.');
      return;
    }
    setPurchaseLoading(true);
    const result = await purchaseMonthly();
    setPurchaseLoading(false);
    if (result.success) {
      setPremium(true);
      showToast('Welcome to GoutGuard Premium!');
    } else if (result.error) {
      showToast(result.error);
    }
  };

  const handleRestore = async () => {
    if (!canPurchase) {
      showToast('Purchase restoration is only available in the native app.');
      return;
    }
    setRestoreLoading(true);
    const result = await restorePurchases();
    setRestoreLoading(false);
    if (result.success) {
      setPremium(result.isPremium);
      showToast(
        result.isPremium
          ? 'Premium subscription restored!'
          : 'No active subscription found.',
      );
    } else if (result.error) {
      showToast(result.error);
    }
  };

  // Export Data
  const handleExportData = () => {
    if (!premium) {
      showToast('Export Data is a premium feature. Upgrade to access.');
      return;
    }
    showToast('Preparing your data export...');
  };

  // Clear all data
  const handleClearAllData = () => {
    try {
      const keys = [
        'goutguard_settings',
        'goutguard_daily_log',
        'goutguard_uric_acid_readings',
        'goutguard_flares',
        'goutguard_water_log',
        'goutguard_medications',
      ];
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage unavailable
    }
    setSettings(DEFAULT_SETTINGS);
    setMedicationCount(0);
    setShowClearConfirm(false);
    showToast('All data has been cleared.');
  };

  // Water unit toggle
  const toggleWaterUnit = () => {
    const currentUnit = settings.waterGoal.unit;
    if (currentUnit === 'oz') {
      const mlAmount = Math.round(settings.waterGoal.amount * 29.5735);
      updateWaterGoal({ amount: mlAmount, unit: 'ml' });
    } else {
      const ozAmount = Math.round(settings.waterGoal.amount / 29.5735);
      updateWaterGoal({ amount: ozAmount, unit: 'oz' });
    }
  };

  return (
    <div className="container">
      {/* ---- Header ---- */}
      <header className="header">
        <button
          className="header-back-btn"
          onClick={() => router.back()}
          type="button"
          aria-label="Go back"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="header-title">Settings</span>
        <div style={{ width: 24 }} />
      </header>

      {/* ---- Toast ---- */}
      {toastMessage && (
        <div className="settings-toast">{toastMessage}</div>
      )}

      {/* ---- Profile Section ---- */}
      <section className="card settings-card">
        <h2 className="card-title">Profile</h2>

        {/* Gout Stage */}
        <div className="settings-field">
          <label className="settings-label" htmlFor="gout-stage">
            Gout Stage
          </label>
          <select
            id="gout-stage"
            className="settings-select"
            value={settings.goutStage}
            onChange={(e) => updateSettings({ goutStage: e.target.value })}
          >
            {GOUT_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage === 'Intercritical' ? 'Intercritical (between flares)' : stage}
              </option>
            ))}
          </select>
        </div>

        {/* Current Medications */}
        <div className="settings-field">
          <label className="settings-label">Current Medications</label>
          <Link href="/medications" className="settings-link-row">
            <span className="settings-link-text">
              {medicationCount} medication{medicationCount !== 1 ? 's' : ''} configured
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Dietary Restrictions / Allergies */}
        <div className="settings-field">
          <label className="settings-label">Dietary Restrictions / Allergies</label>
          <div className="settings-chips">
            {DIETARY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`settings-chip ${
                  settings.dietaryRestrictions.includes(option)
                    ? 'settings-chip-active'
                    : ''
                }`}
                onClick={() => toggleDietaryRestriction(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Goals Section ---- */}
      <section className="card settings-card">
        <h2 className="card-title">Goals</h2>

        {/* Daily Purine Target */}
        <div className="settings-field">
          <label className="settings-label" htmlFor="purine-target">
            Daily Purine Target
          </label>
          <div className="settings-input-row">
            <input
              id="purine-target"
              type="number"
              className="settings-number-input"
              value={settings.purineTarget}
              min={200}
              max={600}
              step={10}
              onChange={(e) => {
                const val = Math.min(600, Math.max(200, Number(e.target.value) || 200));
                updateSettings({ purineTarget: val });
              }}
            />
            <span className="settings-unit">mg</span>
          </div>
          <span className="settings-hint">Recommended range: 200 - 600mg</span>
        </div>

        {/* Water Intake Goal */}
        <div className="settings-field">
          <label className="settings-label" htmlFor="water-goal">
            Water Intake Goal
          </label>
          <div className="settings-input-row">
            <input
              id="water-goal"
              type="number"
              className="settings-number-input"
              value={settings.waterGoal.amount}
              min={1}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value) || 1);
                updateWaterGoal({ amount: val });
              }}
            />
            <button
              type="button"
              className="settings-unit-toggle"
              onClick={toggleWaterUnit}
            >
              {settings.waterGoal.unit}
            </button>
          </div>
        </div>
      </section>

      {/* ---- Notifications Section ---- */}
      <section className="card settings-card">
        <h2 className="card-title">Notifications</h2>

        {/* Medication Reminders */}
        <div className="settings-field settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-label">Medication Reminders</span>
            <Link href="/medications" className="settings-sublink">
              Configure in Medications
            </Link>
          </div>
          <label className="settings-toggle" htmlFor="notif-medications">
            <input
              id="notif-medications"
              type="checkbox"
              checked={settings.notifications.medications}
              onChange={(e) =>
                updateNotifications({ medications: e.target.checked })
              }
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>

        {/* Water Reminders */}
        <div className="settings-field settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-label">Water Reminders</span>
            {settings.notifications.water && (
              <select
                className="settings-select settings-select-small"
                value={settings.notifications.waterFrequency}
                onChange={(e) =>
                  updateNotifications({ waterFrequency: e.target.value })
                }
              >
                {WATER_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <label className="settings-toggle" htmlFor="notif-water">
            <input
              id="notif-water"
              type="checkbox"
              checked={settings.notifications.water}
              onChange={(e) =>
                updateNotifications({ water: e.target.checked })
              }
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>

        {/* Daily Summary */}
        <div className="settings-field settings-toggle-row">
          <span className="settings-label">Daily Summary</span>
          <label className="settings-toggle" htmlFor="notif-summary">
            <input
              id="notif-summary"
              type="checkbox"
              checked={settings.notifications.dailySummary}
              onChange={(e) =>
                updateNotifications({ dailySummary: e.target.checked })
              }
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </section>

      {/* ---- Subscription Section ---- */}
      <section className="card settings-card">
        <h2 className="card-title">Subscription</h2>

        <div className="settings-field">
          <span className="settings-label">Current Plan</span>
          {premium ? (
            <span className="settings-premium-badge">Active Premium Subscription</span>
          ) : (
            <span className="settings-plan-free">Free</span>
          )}
        </div>

        {!premium && (
          <button
            type="button"
            className="settings-upgrade-btn"
            onClick={handleUpgrade}
            disabled={purchaseLoading}
          >
            {purchaseLoading ? 'Processing...' : 'Upgrade to Premium'}
          </button>
        )}

        <button
          type="button"
          className="settings-restore-btn"
          onClick={handleRestore}
          disabled={restoreLoading}
        >
          {restoreLoading ? 'Restoring...' : 'Restore Purchases'}
        </button>

        {!canPurchase && (
          <p className="settings-store-note">
            Download from App Store to subscribe.
          </p>
        )}
      </section>

      {/* ---- Quick Links ---- */}
      <section className="card settings-card">
        <h2 className="card-title">Quick Links</h2>

        <Link href="/medications" className="settings-list-item">
          <span>Medications</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/water" className="settings-list-item">
          <span>Water Tracker</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/flares" className="settings-list-item">
          <span>Flare History</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/meals" className="settings-list-item">
          <span>
            Meal Ideas
            {!premium && <span className="settings-premium-tag">Premium</span>}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <button
          type="button"
          className="settings-list-item settings-list-btn"
          onClick={handleExportData}
        >
          <span>
            Export Data (PDF)
            {!premium && <span className="settings-premium-tag">Premium</span>}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </section>

      {/* ---- Data Management ---- */}
      <section className="card settings-card">
        <h2 className="card-title">Data Management</h2>

        <button
          type="button"
          className="settings-list-item settings-list-btn"
          onClick={handleExportData}
        >
          <span>
            Export Data as PDF
            {!premium && <span className="settings-premium-tag">Premium</span>}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <button
          type="button"
          className="settings-list-item settings-list-btn settings-danger-btn"
          onClick={() => setShowClearConfirm(true)}
        >
          <span>Clear All Data</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </section>

      {/* ---- Clear Confirmation Dialog ---- */}
      {showClearConfirm && (
        <div className="settings-overlay" onClick={() => setShowClearConfirm(false)}>
          <div
            className="settings-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="settings-dialog-title">Clear All Data?</h3>
            <p className="settings-dialog-text">
              This will permanently delete all your tracked data, including food
              logs, uric acid readings, flare history, water logs, and
              medications. This action cannot be undone.
            </p>
            <div className="settings-dialog-actions">
              <button
                type="button"
                className="settings-dialog-cancel"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-dialog-confirm"
                onClick={handleClearAllData}
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Legal ---- */}
      <section className="card settings-card">
        <h2 className="card-title">Legal</h2>

        <Link href="/terms" className="settings-list-item">
          <span>Terms of Service</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/privacy" className="settings-list-item">
          <span>Privacy Policy</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link href="/disclaimer" className="settings-list-item">
          <span>Medical Disclaimer</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </section>

      {/* ---- App Info ---- */}
      <section className="settings-app-info">
        <p className="settings-version">Version 1.0.0</p>
        <p className="settings-tagline">Made with care for gout sufferers</p>
      </section>

      {/* ---- Bottom Navigation Bar ---- */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
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
        <Link href="/settings" className="nav-item active">
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
