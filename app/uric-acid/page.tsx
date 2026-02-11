'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isPremiumActive } from '@/app/lib/storekit';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UricAcidReading {
  id: string;
  date: string; // YYYY-MM-DD
  value: number;
  notes: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'goutguard_uric_acid_readings';

const TIME_FILTERS = ['1 Month', '3 Months', '6 Months', 'All Time'] as const;
type TimeFilter = (typeof TIME_FILTERS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function loadReadings(): UricAcidReading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as UricAcidReading[];
  } catch {
    return [];
  }
}

function saveReadings(readings: UricAcidReading[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
  } catch {
    // localStorage may be full or unavailable
  }
}

function getColorForValue(value: number): string {
  if (value < 6.0) return '#22c55e'; // green
  if (value <= 7.0) return '#eab308'; // yellow
  if (value <= 9.0) return '#f97316'; // orange
  return '#ef4444'; // red
}

function getLabelForValue(value: number): string {
  if (value < 6.0) return 'In Target';
  if (value <= 7.0) return 'Borderline';
  if (value <= 9.0) return 'Elevated';
  return 'High';
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function filterByTimeRange(
  readings: UricAcidReading[],
  filter: TimeFilter,
): UricAcidReading[] {
  if (filter === 'All Time') return readings;

  const now = new Date();
  let cutoff: Date;

  switch (filter) {
    case '1 Month':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3 Months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6 Months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    default:
      return readings;
  }

  return readings.filter((r) => new Date(r.date) >= cutoff);
}

// ---------------------------------------------------------------------------
// Custom tooltip for the chart
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; value: number } }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div
      style={{
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: 8,
        padding: '8px 12px',
        color: '#fff',
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {formatDate(data.date)}
      </div>
      <div style={{ color: getColorForValue(data.value) }}>
        {data.value.toFixed(1)} mg/dL
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom dot for color-coded data points
// ---------------------------------------------------------------------------

function ColorDot(props: { cx?: number; cy?: number; payload?: { value: number } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={getColorForValue(payload.value)}
      stroke="#111827"
      strokeWidth={2}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function UricAcidPage() {
  const router = useRouter();

  // ---- State ----
  const [readings, setReadings] = useState<UricAcidReading[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formDate, setFormDate] = useState(todayString());
  const [formValue, setFormValue] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('3 Months');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);

  // ---- Load on mount ----
  useEffect(() => {
    setReadings(loadReadings());
    setPremium(isPremiumActive());
  }, []);

  // ---- Derived data ----
  const sortedReadings = useMemo(
    () => [...readings].sort((a, b) => b.timestamp - a.timestamp),
    [readings],
  );

  const latestReading = sortedReadings.length > 0 ? sortedReadings[0] : null;

  const chartData = useMemo(() => {
    const chronological = [...readings].sort((a, b) => a.timestamp - b.timestamp);
    const filtered = filterByTimeRange(chronological, timeFilter);
    return filtered.map((r) => ({
      date: r.date,
      value: r.value,
      shortDate: formatShortDate(r.date),
    }));
  }, [readings, timeFilter]);

  const stats = useMemo(() => {
    if (readings.length === 0) return null;
    const values = readings.map((r) => r.value);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      average: sum / values.length,
      highest: Math.max(...values),
      lowest: Math.min(...values),
      inTarget: values.filter((v) => v < 6.0).length,
      total: values.length,
    };
  }, [readings]);

  // ---- Handlers ----
  const handleSaveReading = useCallback(() => {
    const numValue = parseFloat(formValue);
    if (isNaN(numValue) || numValue < 1.0 || numValue > 15.0) return;
    if (!formDate) return;

    const newReading: UricAcidReading = {
      id: generateId(),
      date: formDate,
      value: Math.round(numValue * 10) / 10,
      notes: formNotes.trim(),
      timestamp: new Date(formDate).getTime(),
    };

    const updated = [...readings, newReading];
    setReadings(updated);
    saveReadings(updated);
    setShowModal(false);
    setFormDate(todayString());
    setFormValue('');
    setFormNotes('');
  }, [formDate, formValue, formNotes, readings]);

  const handleDeleteReading = useCallback(
    (id: string) => {
      const updated = readings.filter((r) => r.id !== id);
      setReadings(updated);
      saveReadings(updated);
      setDeleteConfirmId(null);
    },
    [readings],
  );

  // ---- Styles ----
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#111827',
    color: '#f9fafb',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 100,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    borderBottom: '1px solid #1f2937',
    background: '#111827',
    position: 'sticky',
    top: 0,
    zIndex: 40,
  };

  const cardStyle: React.CSSProperties = {
    background: '#1f2937',
    borderRadius: 16,
    padding: 20,
    margin: '16px 20px',
    border: '1px solid #374151',
  };

  const btnPrimary: React.CSSProperties = {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 50,
  };

  const modalContent: React.CSSProperties = {
    background: '#1f2937',
    borderRadius: '20px 20px 0 0',
    padding: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85vh',
    overflowY: 'auto',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: 10,
    color: '#f9fafb',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#9ca3af',
    marginBottom: 6,
  };

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#1f2937',
    borderTop: '1px solid #374151',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 0 24px',
    zIndex: 50,
  };

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'none',
    border: 'none',
    color: active ? '#3b82f6' : '#6b7280',
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    padding: '4px 12px',
  });

  // ---- Render ----
  return (
    <div style={pageStyle}>
      {/* ---- Header ---- */}
      <div style={headerStyle}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: 24,
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
          }}
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
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Uric Acid Tracker
        </h1>
      </div>

      {/* ---- Current Level Card ---- */}
      <div style={cardStyle}>
        {latestReading ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 13, color: '#9ca3af' }}>
                Current Level
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: getColorForValue(latestReading.value),
                  background: `${getColorForValue(latestReading.value)}20`,
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                {getLabelForValue(latestReading.value)}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: getColorForValue(latestReading.value),
                  lineHeight: 1,
                }}
              >
                {latestReading.value.toFixed(1)}
              </span>
              <span style={{ fontSize: 18, color: '#9ca3af' }}>mg/dL</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Target: Below 6.0 mg/dL
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                {formatDate(latestReading.date)}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: '0 auto', display: 'block', color: '#6b7280' }}
              >
                <path d="M12 2C12 2 4 10 4 14a8 8 0 0 0 16 0c0-4-8-12-8-12z" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#9ca3af' }}>
              No readings yet
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              Log your first uric acid reading to get started
            </div>
          </div>
        )}
      </div>

      {/* ---- Log New Reading Button ---- */}
      <div style={{ margin: '0 20px 16px' }}>
        <button onClick={() => setShowModal(true)} style={btnPrimary}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log New Reading
        </button>
      </div>

      {/* ---- Trend Chart (Premium) ---- */}
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            Trend Chart
          </h2>
          {!premium && (
            <span
              style={{
                fontSize: 11,
                background: '#7c3aed',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              PREMIUM
            </span>
          )}
        </div>

        {premium ? (
          <>
            {/* Time filter tabs */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 16,
                overflowX: 'auto',
              }}
            >
              {TIME_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background:
                      timeFilter === f ? '#2563eb' : '#374151',
                    color: timeFilter === f ? '#fff' : '#9ca3af',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {chartData.length >= 2 ? (
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortDate"
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      unit=" "
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine
                      y={6.0}
                      stroke="#22c55e"
                      strokeDasharray="6 4"
                      label={{
                        value: 'Target 6.0',
                        position: 'right',
                        fill: '#22c55e',
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={<ColorDot />}
                      activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 0',
                  color: '#6b7280',
                  fontSize: 14,
                }}
              >
                {chartData.length === 1
                  ? 'Log at least 2 readings to see your trend chart.'
                  : 'No readings in this time period.'}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 16px',
              color: '#9ca3af',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 12px', display: 'block', color: '#7c3aed' }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Unlock Trend Charts
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Upgrade to Premium to visualize your uric acid trends over time.
            </div>
            <button
              onClick={() => router.push('/settings')}
              style={{
                marginTop: 14,
                background: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View Premium
            </button>
          </div>
        )}
      </div>

      {/* ---- Stats Summary (Premium) ---- */}
      {stats && (
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
              Stats Summary
            </h2>
            {!premium && (
              <span
                style={{
                  fontSize: 11,
                  background: '#7c3aed',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                PREMIUM
              </span>
            )}
          </div>

          {premium ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <div
                style={{
                  background: '#111827',
                  borderRadius: 12,
                  padding: 14,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
                  Average
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: getColorForValue(stats.average),
                  }}
                >
                  {stats.average.toFixed(1)}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>mg/dL</div>
              </div>
              <div
                style={{
                  background: '#111827',
                  borderRadius: 12,
                  padding: 14,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
                  Highest
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: getColorForValue(stats.highest),
                  }}
                >
                  {stats.highest.toFixed(1)}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>mg/dL</div>
              </div>
              <div
                style={{
                  background: '#111827',
                  borderRadius: 12,
                  padding: 14,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
                  Lowest
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: getColorForValue(stats.lowest),
                  }}
                >
                  {stats.lowest.toFixed(1)}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>mg/dL</div>
              </div>
              <div
                style={{
                  background: '#111827',
                  borderRadius: 12,
                  padding: 14,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
                  In Target
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#22c55e',
                  }}
                >
                  {stats.inTarget}
                  <span style={{ fontSize: 14, color: '#6b7280' }}>
                    /{stats.total}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>readings</div>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 16px',
                color: '#9ca3af',
              }}
            >
              <div style={{ fontSize: 14 }}>
                Upgrade to Premium to see detailed analytics about your uric acid
                levels.
              </div>
              <button
                onClick={() => router.push('/settings')}
                style={{
                  marginTop: 12,
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View Premium
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---- Reading History ---- */}
      <div style={{ margin: '16px 20px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 12px' }}>
          Reading History
        </h2>

        {sortedReadings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 0',
              color: '#6b7280',
              fontSize: 14,
            }}
          >
            No readings recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedReadings.map((reading) => (
              <div
                key={reading.id}
                style={{
                  background: '#1f2937',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid #374151',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: reading.notes ? 6 : 0,
                    }}
                  >
                    <span style={{ fontSize: 14, color: '#9ca3af' }}>
                      {formatDate(reading.date)}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: getColorForValue(reading.value),
                        background: `${getColorForValue(reading.value)}18`,
                        padding: '2px 10px',
                        borderRadius: 20,
                      }}
                    >
                      {reading.value.toFixed(1)} mg/dL
                    </span>
                  </div>
                  {reading.notes && (
                    <div
                      style={{
                        fontSize: 13,
                        color: '#6b7280',
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {reading.notes}
                    </div>
                  )}
                </div>
                <div>
                  {deleteConfirmId === reading.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleDeleteReading(reading.id)}
                        style={{
                          background: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                          background: '#374151',
                          color: '#9ca3af',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(reading.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: 6,
                      }}
                      aria-label="Delete reading"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Log Reading Modal ---- */}
      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div
            style={modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                Log New Reading
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                }}
                aria-label="Close modal"
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
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Date */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                max={todayString()}
                style={{
                  ...inputStyle,
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* Value */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Uric Acid Level (mg/dL)</label>
              <input
                type="number"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="e.g. 6.5"
                step="0.1"
                min="1.0"
                max="15.0"
                style={inputStyle}
              />
              {formValue && !isNaN(parseFloat(formValue)) && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: getColorForValue(parseFloat(formValue)),
                    fontWeight: 500,
                  }}
                >
                  {getLabelForValue(parseFloat(formValue))}
                  {parseFloat(formValue) < 6.0 && ' - Within target range'}
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. Fasting test, taken at doctor's office"
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Save */}
            <button
              onClick={handleSaveReading}
              disabled={
                !formValue ||
                isNaN(parseFloat(formValue)) ||
                parseFloat(formValue) < 1.0 ||
                parseFloat(formValue) > 15.0 ||
                !formDate
              }
              style={{
                ...btnPrimary,
                opacity:
                  !formValue ||
                  isNaN(parseFloat(formValue)) ||
                  parseFloat(formValue) < 1.0 ||
                  parseFloat(formValue) > 15.0 ||
                  !formDate
                    ? 0.5
                    : 1,
                cursor:
                  !formValue ||
                  isNaN(parseFloat(formValue)) ||
                  parseFloat(formValue) < 1.0 ||
                  parseFloat(formValue) > 15.0 ||
                  !formDate
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Save Reading
            </button>
          </div>
        </div>
      )}

      {/* ---- Bottom Navigation Bar ---- */}
      <nav style={navStyle}>
        <button
          onClick={() => router.push('/scan')}
          style={navItemStyle(false)}
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
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Scan
        </button>
        <button
          onClick={() => router.push('/meals')}
          style={navItemStyle(false)}
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
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
          Meals
        </button>
        <button
          onClick={() => router.push('/uric-acid')}
          style={navItemStyle(true)}
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
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Track
        </button>
        <button
          onClick={() => router.push('/flares')}
          style={navItemStyle(false)}
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
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Flares
        </button>
        <button
          onClick={() => router.push('/settings')}
          style={navItemStyle(false)}
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
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </nav>
    </div>
  );
}
