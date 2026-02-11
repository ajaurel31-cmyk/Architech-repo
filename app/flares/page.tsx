'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { isPremiumActive } from '@/app/lib/storekit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlareEntry {
  id: string;
  date: string;
  joints: string[];
  painLevel: number;
  duration: number;
  durationUnit: 'hours' | 'days';
  triggers: string[];
  treatments: string[];
  notes: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'goutguard_flares';

const JOINT_OPTIONS = [
  'Big Toe',
  'Ankle',
  'Knee',
  'Wrist',
  'Finger',
  'Elbow',
  'Other',
];

const TRIGGER_OPTIONS = [
  'Red Meat',
  'Seafood',
  'Alcohol',
  'Beer',
  'Dehydration',
  'Stress',
  'Injury',
  'Medication Change',
  'Other',
];

const TREATMENT_OPTIONS = [
  'Colchicine',
  'NSAIDs (Ibuprofen)',
  'Prednisone',
  'Ice',
  'Rest',
  'Elevation',
  'Cherry Juice',
  'Other',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `flare_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function loadFlares(): FlareEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as FlareEntry[];
  } catch {
    return [];
  }
}

function saveFlares(flares: FlareEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flares));
  } catch {
    // localStorage may be unavailable
  }
}

function formatDateForInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function daysSinceDate(dateStr: string): number {
  const flareDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - flareDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function painColor(level: number): string {
  if (level <= 3) return '#10b981';
  if (level <= 6) return '#eab308';
  if (level <= 8) return '#f97316';
  return '#ef4444';
}

function painLabel(level: number): string {
  if (level <= 3) return 'Mild';
  if (level <= 6) return 'Moderate';
  if (level <= 8) return 'High';
  return 'Severe';
}

// ---------------------------------------------------------------------------
// Chip Component
// ---------------------------------------------------------------------------

function Chip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 14px',
        borderRadius: '20px',
        border: selected ? '2px solid #1a56db' : '2px solid #d1d5db',
        background: selected ? '#e8eefb' : '#fff',
        color: selected ? '#1a56db' : '#4b5563',
        fontSize: '13px',
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Badge Component
// ---------------------------------------------------------------------------

function Badge({
  text,
  color = '#1a56db',
}: {
  text: string;
  color?: string;
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        background: `${color}18`,
        color,
        marginRight: '4px',
        marginBottom: '4px',
      }}
    >
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Log Flare Modal
// ---------------------------------------------------------------------------

function LogFlareModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (entry: FlareEntry) => void;
}) {
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [joints, setJoints] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(5);
  const [duration, setDuration] = useState(1);
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [treatments, setTreatments] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const toggleItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const handleSave = () => {
    if (joints.length === 0) {
      alert('Please select at least one affected joint.');
      return;
    }

    const entry: FlareEntry = {
      id: generateId(),
      date,
      joints,
      painLevel,
      duration,
      durationUnit,
      triggers,
      treatments,
      notes: notes.trim(),
      timestamp: Date.now(),
    };

    onSave(entry);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 20px 32px',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
            Log Flare
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#6b7280',
            }}
          >
            x
          </button>
        </div>

        {/* Date / Time */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            Date &amp; Time of Onset
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #d1d5db',
              fontSize: '15px',
              color: '#111827',
              background: '#f9fafb',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Affected Joint(s) */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            Affected Joint(s)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {JOINT_OPTIONS.map((j) => (
              <Chip
                key={j}
                label={j}
                selected={joints.includes(j)}
                onToggle={() => setJoints(toggleItem(joints, j))}
              />
            ))}
          </div>
        </div>

        {/* Pain Level */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            Pain Level
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '30px' }}>Mild</span>
            <input
              type="range"
              min={1}
              max={10}
              value={painLevel}
              onChange={(e) => setPainLevel(Number(e.target.value))}
              style={{
                flex: 1,
                accentColor: painColor(painLevel),
                height: '6px',
              }}
            />
            <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '42px' }}>Severe</span>
          </div>
          <div
            style={{
              textAlign: 'center',
              marginTop: '6px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                background: painColor(painLevel),
                color: '#fff',
                padding: '2px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {painLevel} / 10 — {painLabel(painLevel)}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            Duration
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '15px',
                color: '#111827',
                background: '#f9fafb',
                boxSizing: 'border-box',
              }}
            />
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as 'hours' | 'days')}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '15px',
                color: '#111827',
                background: '#f9fafb',
                minWidth: '100px',
              }}
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>

        {/* Possible Triggers */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            Possible Triggers
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TRIGGER_OPTIONS.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={triggers.includes(t)}
                onToggle={() => setTriggers(toggleItem(triggers, t))}
              />
            ))}
          </div>
        </div>

        {/* Treatment Used */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            Treatment Used
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TREATMENT_OPTIONS.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={treatments.includes(t)}
                onToggle={() => setTreatments(toggleItem(treatments, t))}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details about this flare..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #d1d5db',
              fontSize: '15px',
              color: '#111827',
              background: '#f9fafb',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: '#1a56db',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Save Flare
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flare History Item
// ---------------------------------------------------------------------------

function FlareHistoryItem({
  flare,
  onDelete,
}: {
  flare: FlareEntry;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #f3f4f6',
      }}
    >
      {/* Top Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '6px',
            }}
          >
            {formatDisplayDate(flare.date)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            {flare.joints.map((j) => (
              <Badge key={j} text={j} color="#1a56db" />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '13px',
              color: '#6b7280',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: painColor(flare.painLevel),
                }}
              />
              Pain: {flare.painLevel}/10
            </span>
            <span>
              {flare.duration} {flare.durationUnit}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: '18px',
            color: '#9ca3af',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            marginLeft: '8px',
          }}
        >
          v
        </span>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div
          style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid #f3f4f6',
          }}
        >
          {flare.triggers.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Triggers
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {flare.triggers.map((t) => (
                  <Badge key={t} text={t} color="#dc2626" />
                ))}
              </div>
            </div>
          )}

          {flare.treatments.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Treatment
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {flare.treatments.map((t) => (
                  <Badge key={t} text={t} color="#10b981" />
                ))}
              </div>
            </div>
          )}

          {flare.notes && (
            <div style={{ marginBottom: '10px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Notes
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: '#374151',
                  margin: 0,
                  lineHeight: '1.5',
                }}
              >
                {flare.notes}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this flare entry?')) {
                onDelete(flare.id);
              }
            }}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete Flare
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics Card (Premium)
// ---------------------------------------------------------------------------

function AnalyticsCard({ flares, premium }: { flares: FlareEntry[]; premium: boolean }) {
  const analytics = useMemo(() => {
    if (flares.length === 0) return null;

    // Average flares per month
    const dates = flares.map((f) => new Date(f.date));
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date();
    const monthSpan = Math.max(
      1,
      (latest.getFullYear() - earliest.getFullYear()) * 12 +
        (latest.getMonth() - earliest.getMonth()) +
        1,
    );
    const avgPerMonth = (flares.length / monthSpan).toFixed(1);

    // Most common joint
    const jointCounts: Record<string, number> = {};
    flares.forEach((f) => f.joints.forEach((j) => (jointCounts[j] = (jointCounts[j] || 0) + 1)));
    const topJoint = Object.entries(jointCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Top 3 triggers
    const triggerCounts: Record<string, number> = {};
    flares.forEach((f) =>
      f.triggers.forEach((t) => (triggerCounts[t] = (triggerCounts[t] || 0) + 1)),
    );
    const topTriggers = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Average pain
    const avgPain = (flares.reduce((sum, f) => sum + f.painLevel, 0) / flares.length).toFixed(1);

    // Average duration (normalize to hours)
    const totalHours = flares.reduce(
      (sum, f) => sum + (f.durationUnit === 'days' ? f.duration * 24 : f.duration),
      0,
    );
    const avgHours = totalHours / flares.length;
    const avgDuration =
      avgHours >= 48
        ? `${(avgHours / 24).toFixed(1)} days`
        : `${avgHours.toFixed(1)} hours`;

    return { avgPerMonth, topJoint, topTriggers, avgPain, avgDuration };
  }, [flares]);

  if (!analytics) return null;

  return (
    <div
      style={{
        background: premium ? '#fff' : '#f9fafb',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
          Flare Analytics
        </h3>
        {!premium && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#b45309',
              background: '#fef3c7',
              padding: '2px 10px',
              borderRadius: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Premium
          </span>
        )}
      </div>

      <div
        style={{
          filter: premium ? 'none' : 'blur(6px)',
          pointerEvents: premium ? 'auto' : 'none',
          userSelect: premium ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}
        >
          {/* Avg per month */}
          <div
            style={{
              background: '#f0f5ff',
              borderRadius: '10px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Avg Flares/Month
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a56db' }}>
              {analytics.avgPerMonth}
            </div>
          </div>

          {/* Average pain */}
          <div
            style={{
              background: '#fef2f2',
              borderRadius: '10px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Avg Pain Level
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: painColor(Math.round(Number(analytics.avgPain))),
              }}
            >
              {analytics.avgPain}/10
            </div>
          </div>

          {/* Most common joint */}
          <div
            style={{
              background: '#f0fdf4',
              borderRadius: '10px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Most Affected Joint
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              {analytics.topJoint}
            </div>
          </div>

          {/* Average duration */}
          <div
            style={{
              background: '#fffbeb',
              borderRadius: '10px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Avg Duration
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              {analytics.avgDuration}
            </div>
          </div>
        </div>

        {/* Top triggers */}
        {analytics.topTriggers.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              Most Common Triggers
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {analytics.topTriggers.map((t, i) => (
                <span
                  key={t}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    background: i === 0 ? '#fef2f2' : '#f3f4f6',
                    color: i === 0 ? '#dc2626' : '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  #{i + 1} {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Premium overlay CTA */}
      {!premium && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '14px',
          }}
        >
          <a
            href="/settings"
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: '#1a56db',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(26,86,219,0.3)',
            }}
          >
            Unlock Analytics
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottom Navigation
// ---------------------------------------------------------------------------

function BottomNav() {
  const tabs = [
    { label: 'Home', href: '/', icon: 'H' },
    { label: 'Scan', href: '/scan', icon: 'S' },
    { label: 'Track', href: '/flares', icon: 'T' },
    { label: 'Meals', href: '/meals', icon: 'M' },
    { label: 'Settings', href: '/settings', icon: 'G' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 900,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.label === 'Track';
        return (
          <a
            key={tab.label}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: active ? '#1a56db' : '#9ca3af',
              fontSize: '11px',
              fontWeight: active ? 700 : 500,
              gap: '2px',
              flex: 1,
            }}
          >
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: active ? '#e8eefb' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              {tab.icon}
            </span>
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function FlaresPage() {
  const [flares, setFlares] = useState<FlareEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [premium, setPremium] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFlares(loadFlares());
    setPremium(isPremiumActive());
    setLoaded(true);
  }, []);

  const sortedFlares = useMemo(
    () => [...flares].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [flares],
  );

  const lastFlare = sortedFlares[0] || null;
  const daysSinceLast = lastFlare ? daysSinceDate(lastFlare.date) : null;

  const handleSave = useCallback(
    (entry: FlareEntry) => {
      const updated = [...flares, entry];
      setFlares(updated);
      saveFlares(updated);
      setShowModal(false);
    },
    [flares],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const updated = flares.filter((f) => f.id !== id);
      setFlares(updated);
      saveFlares(updated);
    },
    [flares],
  );

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ color: '#9ca3af', fontSize: '16px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        paddingBottom: '84px',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        style={{
          background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
          padding: '16px 20px',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <a
          href="/"
          style={{
            color: '#fff',
            textDecoration: 'none',
            fontSize: '24px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.15)',
          }}
        >
          &larr;
        </a>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#fff',
            margin: 0,
          }}
        >
          Flare Logger
        </h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
        {/* ── Current Status Card ──────────────────────────────────────── */}
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
          }}
        >
          {daysSinceLast !== null ? (
            <>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 800,
                  color: '#1a56db',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}
              >
                {daysSinceLast}
              </div>
              <div style={{ fontSize: '15px', color: '#6b7280', fontWeight: 500 }}>
                {daysSinceLast === 1 ? 'day' : 'days'} since last flare
              </div>
            </>
          ) : (
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: '16px', color: '#6b7280', fontWeight: 500 }}>
                No flares recorded yet.
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
                Tap the button below to log your first flare.
              </div>
            </div>
          )}
        </div>

        {/* ── Log Flare Button ────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          + Log a Flare
        </button>

        {/* ── Analytics Card (Premium) ────────────────────────────────── */}
        {sortedFlares.length > 0 && (
          <AnalyticsCard flares={sortedFlares} premium={premium} />
        )}

        {/* ── Flare History ───────────────────────────────────────────── */}
        {sortedFlares.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '14px',
                marginTop: 0,
              }}
            >
              Flare History
            </h2>
            {sortedFlares.map((flare) => (
              <FlareHistoryItem
                key={flare.id}
                flare={flare}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* ── Empty state for history ─────────────────────────────────── */}
        {sortedFlares.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#9ca3af',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>
              /
            </div>
            <div style={{ fontSize: '15px', fontWeight: 500 }}>
              No flare history yet
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              Log a flare to start tracking your patterns.
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation ──────────────────────────────────────────── */}
      <BottomNav />

      {/* ── Log Flare Modal ────────────────────────────────────────────── */}
      {showModal && (
        <LogFlareModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {/* ── Inline keyframe animation ─────────────────────────────────── */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: #e5e7eb;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: currentColor;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
