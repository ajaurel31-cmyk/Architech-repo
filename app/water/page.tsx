'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WaterLogEntry {
  id: string;
  amount: number;
  unit: 'oz' | 'ml';
  date: string;
  timestamp: number;
}

interface WaterGoal {
  amount: number;
  unit: 'oz' | 'ml';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY_LOG = 'goutguard_water_log';
const STORAGE_KEY_GOAL = 'goutguard_water_goal';

const DEFAULT_GOAL: WaterGoal = { amount: 64, unit: 'oz' };

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isSameDay(dateStr: string, targetDay: string): boolean {
  return dateStr.startsWith(targetDay);
}

function getDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayLabel(daysAgo: number): string {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

function safeSetJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

function convertAmount(amount: number, from: 'oz' | 'ml', to: 'oz' | 'ml'): number {
  if (from === to) return amount;
  if (from === 'oz' && to === 'ml') return Math.round(amount * 29.5735);
  return Math.round(amount / 29.5735);
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ---------------------------------------------------------------------------
// Inline Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    background: '#f0f4f8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 100,
    color: '#1a202c',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
    color: '#475569',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
    flex: 1,
  },
  content: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  infoCard: {
    background: 'linear-gradient(135deg, #ebf5ff 0%, #e0f2fe 100%)',
    borderRadius: 16,
    padding: 16,
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    marginTop: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e40af',
    margin: '0 0 4px 0',
  },
  infoText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 1.5,
    margin: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a202c',
    margin: '0 0 16px 0',
  },
  progressCenter: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressBig: {
    fontSize: 36,
    fontWeight: 800,
    lineHeight: 1,
  },
  progressUnit: {
    fontSize: 16,
    fontWeight: 500,
    color: '#64748b',
  },
  progressBarOuter: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    background: '#e2e8f0',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 8,
    transition: 'width 0.4s ease, background 0.4s ease',
  },
  percentLabel: {
    fontSize: 14,
    fontWeight: 600,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  quickAddRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  quickAddBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '14px 4px',
    borderRadius: 12,
    border: '2px solid #bfdbfe',
    background: '#eff6ff',
    cursor: 'pointer',
    color: '#1d4ed8',
    fontWeight: 600,
    fontSize: 12,
    transition: 'all 0.15s ease',
  },
  logList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  logItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
  },
  logTime: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 500,
    minWidth: 80,
  },
  logAmount: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1e40af',
    flex: 1,
    textAlign: 'center' as const,
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    border: 'none',
    background: '#fee2e2',
    cursor: 'pointer',
    color: '#dc2626',
    flexShrink: 0,
    fontSize: 14,
    fontWeight: 700,
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: 14,
    padding: '12px 0',
    fontStyle: 'italic' as const,
  },
  goalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalDisplay: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a202c',
  },
  goalActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    cursor: 'pointer',
    color: '#1d4ed8',
    fontWeight: 600,
    fontSize: 13,
  },
  unitToggle: {
    display: 'flex',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  unitBtn: {
    padding: '6px 12px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  unitBtnActive: {
    background: '#1d4ed8',
    color: '#fff',
  },
  unitBtnInactive: {
    background: '#f8fafc',
    color: '#64748b',
  },
  goalEditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  goalInput: {
    width: 80,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 15,
    fontWeight: 600,
    textAlign: 'center' as const,
    outline: 'none',
  },
  saveBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#1d4ed8',
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#64748b',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  weeklyRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    height: 120,
  },
  weeklyDayCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  weeklyBarOuter: {
    width: '100%',
    maxWidth: 36,
    height: 80,
    borderRadius: 6,
    background: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weeklyBarInner: {
    width: '100%',
    borderRadius: 6,
    transition: 'height 0.3s ease',
  },
  weeklyLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
  },
  weeklyAmount: {
    fontSize: 10,
    fontWeight: 700,
    color: '#334155',
  },
  customInputOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  customInputModal: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    width: 300,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  customInputTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    textAlign: 'center' as const,
  },
  customInputField: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    fontSize: 18,
    fontWeight: 600,
    textAlign: 'center' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  customInputActions: {
    display: 'flex',
    gap: 10,
  },
  bottomNav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '8px 0 env(safe-area-inset-bottom, 8px)',
    zIndex: 50,
    maxWidth: 480,
    margin: '0 auto',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
    fontSize: 11,
    fontWeight: 500,
    color: '#94a3b8',
    textDecoration: 'none',
    padding: '4px 8px',
  },
  navItemActive: {
    color: '#1d4ed8',
    fontWeight: 700,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WaterTrackerPage() {
  const [waterLog, setWaterLog] = useState<WaterLogEntry[]>([]);
  const [goal, setGoal] = useState<WaterGoal>(DEFAULT_GOAL);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  // Load data from localStorage
  const loadData = useCallback(() => {
    const log = safeParseJSON<WaterLogEntry[]>(STORAGE_KEY_LOG, []);
    setWaterLog(log);

    const savedGoal = safeParseJSON<WaterGoal>(STORAGE_KEY_GOAL, DEFAULT_GOAL);
    if (savedGoal && savedGoal.amount > 0) {
      setGoal(savedGoal);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persist log changes
  const persistLog = useCallback((newLog: WaterLogEntry[]) => {
    setWaterLog(newLog);
    safeSetJSON(STORAGE_KEY_LOG, newLog);
  }, []);

  // Persist goal changes
  const persistGoal = useCallback((newGoal: WaterGoal) => {
    setGoal(newGoal);
    safeSetJSON(STORAGE_KEY_GOAL, newGoal);
  }, []);

  // Add water entry
  const addWater = useCallback((amountInOz: number) => {
    const entry: WaterLogEntry = {
      id: generateId(),
      amount: amountInOz,
      unit: 'oz',
      date: new Date().toISOString(),
      timestamp: Date.now(),
    };
    const currentLog = safeParseJSON<WaterLogEntry[]>(STORAGE_KEY_LOG, []);
    const newLog = [...currentLog, entry];
    persistLog(newLog);
  }, [persistLog]);

  // Remove water entry
  const removeEntry = useCallback((id: string) => {
    const currentLog = safeParseJSON<WaterLogEntry[]>(STORAGE_KEY_LOG, []);
    const newLog = currentLog.filter((e) => e.id !== id);
    persistLog(newLog);
  }, [persistLog]);

  // Handle custom add
  const handleCustomAdd = useCallback(() => {
    const parsed = parseFloat(customAmount);
    if (!isNaN(parsed) && parsed > 0) {
      const amountOz = goal.unit === 'ml' ? Math.round(parsed / 29.5735) : parsed;
      addWater(amountOz);
      setCustomAmount('');
      setShowCustomInput(false);
    }
  }, [customAmount, goal.unit, addWater]);

  // Handle goal save
  const handleGoalSave = useCallback(() => {
    const parsed = parseFloat(goalDraft);
    if (!isNaN(parsed) && parsed > 0) {
      persistGoal({ amount: parsed, unit: goal.unit });
      setEditingGoal(false);
    }
  }, [goalDraft, goal.unit, persistGoal]);

  // Toggle unit
  const toggleUnit = useCallback((unit: 'oz' | 'ml') => {
    const newGoal: WaterGoal = {
      amount: convertAmount(goal.amount, goal.unit, unit),
      unit,
    };
    persistGoal(newGoal);
  }, [goal, persistGoal]);

  // Today's entries
  const todayStr = getTodayString();
  const todayEntries = useMemo(() => {
    return waterLog
      .filter((e) => isSameDay(e.date, todayStr))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [waterLog, todayStr]);

  // Today's total in oz
  const todayTotalOz = useMemo(() => {
    return todayEntries.reduce((sum, e) => sum + e.amount, 0);
  }, [todayEntries]);

  // Goal in oz for comparison
  const goalInOz = goal.unit === 'oz' ? goal.amount : Math.round(goal.amount / 29.5735);

  // Display values
  const displayCurrent = goal.unit === 'oz' ? todayTotalOz : convertAmount(todayTotalOz, 'oz', 'ml');
  const displayGoal = goal.amount;
  const unitLabel = goal.unit;

  const percentage = goalInOz > 0 ? Math.round((todayTotalOz / goalInOz) * 100) : 0;
  const barWidth = Math.min(percentage, 100);

  // Progress color
  const getProgressColor = (pct: number): string => {
    if (pct >= 100) return '#22c55e';
    if (pct >= 50) return '#14b8a6';
    return '#3b82f6';
  };

  const progressColor = getProgressColor(percentage);

  const getProgressStatus = (pct: number): string => {
    if (pct >= 100) return 'Goal reached! Great job staying hydrated.';
    if (pct >= 75) return 'Almost there! Keep it up.';
    if (pct >= 50) return 'Halfway there. Keep drinking!';
    if (pct >= 25) return 'Good start. Stay consistent.';
    return 'Time to hydrate! Your body needs water.';
  };

  // Weekly data
  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayStr = getDateString(6 - i);
      const dayEntries = waterLog.filter((e) => isSameDay(e.date, dayStr));
      const totalOz = dayEntries.reduce((sum, e) => sum + e.amount, 0);
      return {
        label: getDayLabel(6 - i),
        shortLabel: 6 - i === 0 ? 'Today' : new Date(new Date().setDate(new Date().getDate() - (6 - i))).toLocaleDateString('en-US', { weekday: 'short' }),
        totalOz,
        displayTotal: goal.unit === 'oz' ? totalOz : convertAmount(totalOz, 'oz', 'ml'),
      };
    });
  }, [waterLog, goal.unit]);

  const weeklyMax = Math.max(...weeklyData.map((d) => d.totalOz), goalInOz);

  return (
    <div style={styles.container}>
      {/* ---- Header ---- */}
      <header style={styles.header}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button type="button" style={styles.backBtn} aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </Link>
        <h1 style={styles.headerTitle}>Water Tracker</h1>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="#3b82f6" opacity="0.2" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      </header>

      <div style={styles.content}>
        {/* ---- Why Hydration Matters ---- */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h3 style={styles.infoTitle}>Why Hydration Matters</h3>
            <p style={styles.infoText}>
              Staying well-hydrated helps your body flush uric acid more efficiently. Aim for at least 8 glasses (64oz / 2L) of water daily.
            </p>
          </div>
        </div>

        {/* ---- Daily Progress ---- */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Daily Progress</h2>
          <div style={styles.progressCenter}>
            <div>
              <span style={{ ...styles.progressBig, color: progressColor }}>
                {displayCurrent}
              </span>
              <span style={styles.progressUnit}> / {displayGoal} {unitLabel}</span>
            </div>
          </div>
          <div style={styles.progressBarOuter}>
            <div
              style={{
                ...styles.progressBarInner,
                width: `${barWidth}%`,
                background: `linear-gradient(90deg, ${progressColor}cc, ${progressColor})`,
              }}
            />
          </div>
          <p style={{ ...styles.percentLabel, color: progressColor }}>
            {percentage}% complete
          </p>
          <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', margin: '4px 0 0 0' }}>
            {getProgressStatus(percentage)}
          </p>
        </div>

        {/* ---- Quick Add Buttons ---- */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Quick Add</h2>
          <div style={styles.quickAddRow}>
            {/* 8oz Glass */}
            <button
              type="button"
              style={styles.quickAddBtn}
              onClick={() => addWater(8)}
              aria-label="Add 8oz glass of water"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 2h8l-1.5 18h-5L8 2z" />
                <path d="M7 2h10" />
              </svg>
              <span>8oz</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>Glass</span>
            </button>

            {/* 12oz Bottle */}
            <button
              type="button"
              style={styles.quickAddBtn}
              onClick={() => addWater(12)}
              aria-label="Add 12oz bottle of water"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 2h4v3l2 2v13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7l2-2V2z" />
                <path d="M10 2h4" />
              </svg>
              <span>12oz</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>Bottle</span>
            </button>

            {/* 16oz Bottle */}
            <button
              type="button"
              style={styles.quickAddBtn}
              onClick={() => addWater(16)}
              aria-label="Add 16oz bottle of water"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 1h6v3l2 3v13a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V7l2-3V1z" />
                <path d="M9 1h6" />
                <path d="M8 12h8" />
              </svg>
              <span>16oz</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>Lg Bottle</span>
            </button>

            {/* Custom */}
            <button
              type="button"
              style={styles.quickAddBtn}
              onClick={() => setShowCustomInput(true)}
              aria-label="Add custom amount of water"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Custom</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>{unitLabel}</span>
            </button>
          </div>
        </div>

        {/* ---- Today's Log ---- */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Today&apos;s Log</h2>
          {todayEntries.length === 0 ? (
            <p style={styles.emptyState}>No water logged today. Use the buttons above to start tracking.</p>
          ) : (
            <ul style={styles.logList}>
              {todayEntries.map((entry) => (
                <li key={entry.id} style={styles.logItem}>
                  <span style={styles.logTime}>{formatTime(entry.timestamp)}</span>
                  <span style={styles.logAmount}>
                    {goal.unit === 'oz' ? entry.amount : convertAmount(entry.amount, 'oz', 'ml')} {unitLabel}
                  </span>
                  <button
                    type="button"
                    style={styles.removeBtn}
                    onClick={() => removeEntry(entry.id)}
                    aria-label={`Remove ${entry.amount}oz entry`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Daily Goal Setting ---- */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Daily Goal</h2>
          <div style={styles.goalRow}>
            <span style={styles.goalDisplay}>
              {goal.amount} {goal.unit}
            </span>
            <div style={styles.goalActions}>
              <div style={styles.unitToggle}>
                <button
                  type="button"
                  style={{
                    ...styles.unitBtn,
                    ...(goal.unit === 'oz' ? styles.unitBtnActive : styles.unitBtnInactive),
                  }}
                  onClick={() => toggleUnit('oz')}
                >
                  oz
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.unitBtn,
                    ...(goal.unit === 'ml' ? styles.unitBtnActive : styles.unitBtnInactive),
                  }}
                  onClick={() => toggleUnit('ml')}
                >
                  mL
                </button>
              </div>
              <button
                type="button"
                style={styles.editBtn}
                onClick={() => {
                  setGoalDraft(String(goal.amount));
                  setEditingGoal(true);
                }}
              >
                Edit
              </button>
            </div>
          </div>
          {editingGoal && (
            <div style={styles.goalEditRow}>
              <input
                type="number"
                style={styles.goalInput}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                min="1"
                placeholder={String(goal.amount)}
                autoFocus
              />
              <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>{goal.unit}</span>
              <button type="button" style={styles.saveBtn} onClick={handleGoalSave}>
                Save
              </button>
              <button type="button" style={styles.cancelBtn} onClick={() => setEditingGoal(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* ---- Weekly Summary ---- */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Weekly Summary</h2>
          <div style={styles.weeklyRow}>
            {weeklyData.map((day, i) => {
              const barHeight = weeklyMax > 0 ? (day.totalOz / weeklyMax) * 80 : 0;
              const barColor = day.totalOz >= goalInOz ? '#22c55e' : day.totalOz > 0 ? '#3b82f6' : '#cbd5e1';
              return (
                <div key={i} style={styles.weeklyDayCol}>
                  <span style={styles.weeklyAmount}>
                    {day.displayTotal > 0 ? day.displayTotal : ''}
                  </span>
                  <div style={styles.weeklyBarOuter}>
                    <div
                      style={{
                        ...styles.weeklyBarInner,
                        height: barHeight,
                        background: barColor,
                      }}
                    />
                  </div>
                  <span style={styles.weeklyLabel}>{day.shortLabel}</span>
                </div>
              );
            })}
          </div>
          {/* Goal line reference */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            justifyContent: 'center',
          }}>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: '#22c55e' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>= Goal met</span>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: '#3b82f6', marginLeft: 12 }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>= Below goal</span>
          </div>
        </div>
      </div>

      {/* ---- Custom Amount Modal ---- */}
      {showCustomInput && (
        <div
          style={styles.customInputOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCustomInput(false);
          }}
        >
          <div style={styles.customInputModal}>
            <h3 style={styles.customInputTitle}>Add Custom Amount</h3>
            <input
              type="number"
              style={styles.customInputField}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Amount in ${unitLabel}`}
              min="1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomAdd();
                if (e.key === 'Escape') setShowCustomInput(false);
              }}
            />
            <div style={styles.customInputActions}>
              <button
                type="button"
                style={{ ...styles.cancelBtn, flex: 1 }}
                onClick={() => {
                  setCustomAmount('');
                  setShowCustomInput(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ ...styles.saveBtn, flex: 1 }}
                onClick={handleCustomAdd}
              >
                Add {unitLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Bottom Navigation Bar ---- */}
      <nav style={styles.bottomNav}>
        <Link href="/" style={styles.navItem}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </Link>
        <Link href="/scan" style={styles.navItem}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>Scan</span>
        </Link>
        <Link href="/database" style={styles.navItem}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span>Database</span>
        </Link>
        <Link href="/uric-acid" style={styles.navItem}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Track</span>
        </Link>
        <Link href="/settings" style={styles.navItem}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
