'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PURINE_DATABASE,
  CATEGORIES,
  PURINE_LEVELS,
  searchFoods,
  type PurineFood,
} from '@/app/lib/purine-database';
import { isPremiumActive } from '@/app/lib/storekit';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREE_LIMIT = 50;

const LEVEL_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'high', label: 'High' },
  { key: 'very_high', label: 'Very High' },
];

const CATEGORY_FILTERS: string[] = ['All', ...CATEGORIES];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLevelBadgeStyle(level: keyof typeof PURINE_LEVELS): React.CSSProperties {
  const info = PURINE_LEVELS[level];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.3,
    color: '#fff',
    backgroundColor: info.color,
    whiteSpace: 'nowrap',
  };
}

function formatLevelLabel(level: keyof typeof PURINE_LEVELS): string {
  return PURINE_LEVELS[level].label;
}

// ---------------------------------------------------------------------------
// Component: SearchIcon (inline SVG)
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9ca3af"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component: ChevronLeftIcon
// ---------------------------------------------------------------------------

function ChevronLeftIcon() {
  return (
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component: CloseIcon
// ---------------------------------------------------------------------------

function CloseIcon() {
  return (
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component: LockIcon
// ---------------------------------------------------------------------------

function LockIcon() {
  return (
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Bottom Nav Icons
// ---------------------------------------------------------------------------

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a56db' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CameraIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a56db' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function DatabaseIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a56db' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function ChartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a56db' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function SettingsIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a56db' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component: FoodDetailModal
// ---------------------------------------------------------------------------

function FoodDetailModal({
  food,
  onClose,
}: {
  food: PurineFood;
  onClose: () => void;
}) {
  const handleAddToLog = useCallback(() => {
    try {
      const key = 'goutguard_daily_log';
      const existing = localStorage.getItem(key);
      const log: Array<{
        id: string;
        foodId: string;
        name: string;
        purineContent: number;
        purineLevel: string;
        servingSize: string;
        timestamp: string;
      }> = existing ? JSON.parse(existing) : [];

      log.push({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        foodId: food.id,
        name: food.name,
        purineContent: food.purineContent,
        purineLevel: food.purineLevel,
        servingSize: food.servingSize,
        timestamp: new Date().toISOString(),
      });

      localStorage.setItem(key, JSON.stringify(log));
      onClose();
    } catch {
      // localStorage unavailable
    }
  }, [food, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '24px 20px 36px',
          maxHeight: '80vh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#d1d5db',
            margin: '0 auto 16px',
          }}
        />

        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Food name */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
          {food.name}
        </h2>

        {/* Purine content + level badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            padding: '14px 16px',
            backgroundColor: '#f9fafb',
            borderRadius: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Purine Content</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
              {food.purineContent}
              <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>
                mg/100g
              </span>
            </div>
          </div>
          <span style={getLevelBadgeStyle(food.purineLevel)}>
            {formatLevelLabel(food.purineLevel)}
          </span>
        </div>

        {/* Serving size */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            padding: '10px 16px',
            backgroundColor: '#f0f5ff',
            borderRadius: 10,
          }}
        >
          <span style={{ fontSize: 13, color: '#6b7280' }}>Serving Size:</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a56db' }}>{food.servingSize}</span>
        </div>

        {/* Description / gout impact */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Gout Impact Notes
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#4b5563', margin: 0 }}>
            {food.description}
          </p>
        </div>

        {/* Category */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            backgroundColor: '#f3f4f6',
            borderRadius: 8,
            fontSize: 13,
            color: '#6b7280',
            marginBottom: 24,
          }}
        >
          Category: <span style={{ fontWeight: 600, color: '#374151' }}>{food.category}</span>
        </div>

        {/* Add to Daily Log button */}
        <button
          onClick={handleAddToLog}
          style={{
            width: '100%',
            padding: '14px 20px',
            backgroundColor: '#1a56db',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add to Daily Log
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: FoodListItem
// ---------------------------------------------------------------------------

function FoodListItem({
  food,
  onSelect,
}: {
  food: PurineFood;
  onSelect: (food: PurineFood) => void;
}) {
  return (
    <button
      onClick={() => onSelect(food)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.15s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 3 }}>
          {food.name}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{food.category}</div>
        <div
          style={{
            fontSize: 12,
            color: '#6b7280',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {food.description}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
          {food.purineContent}
          <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', marginLeft: 2 }}>
            mg/100g
          </span>
        </div>
        <span style={getLevelBadgeStyle(food.purineLevel)}>
          {formatLevelLabel(food.purineLevel)}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component: PaywallCard
// ---------------------------------------------------------------------------

function PaywallCard() {
  const router = useRouter();

  return (
    <div
      style={{
        margin: '12px 0 16px',
        padding: '20px',
        background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)',
        borderRadius: 16,
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <LockIcon />
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Unlock Full Database</h3>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 16px', opacity: 0.9 }}>
        Free users can browse the first {FREE_LIMIT} foods. Upgrade to GoutGuard Premium to access
        the complete database of {PURINE_DATABASE.length}+ foods with detailed purine data.
      </p>
      <button
        onClick={() => router.push('/settings')}
        style={{
          width: '100%',
          padding: '12px 20px',
          backgroundColor: '#fff',
          color: '#1a56db',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Upgrade to Premium
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function PurineDatabasePage() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFood, setSelectedFood] = useState<PurineFood | null>(null);
  const [premium, setPremium] = useState(false);

  // Check premium status on mount
  useEffect(() => {
    setPremium(isPremiumActive());
  }, []);

  // Filtered food list
  const filteredFoods = useMemo(() => {
    const levelArg = selectedLevel === 'all' ? undefined : selectedLevel;
    const categoryArg = selectedCategory === 'All' ? undefined : selectedCategory;
    return searchFoods(query, categoryArg, levelArg);
  }, [query, selectedLevel, selectedCategory]);

  // Apply premium gate
  const visibleFoods = useMemo(() => {
    if (premium) return filteredFoods;
    return filteredFoods.slice(0, FREE_LIMIT);
  }, [filteredFoods, premium]);

  const totalCount = filteredFoods.length;
  const visibleCount = visibleFoods.length;
  const isGated = !premium && filteredFoods.length > FREE_LIMIT;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#1a56db',
          padding: '16px 16px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Go back"
        >
          <ChevronLeftIcon />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
          Purine Database
        </h1>
      </header>

      {/* ── Search Bar ──────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: '10px 14px',
            border: '1px solid #e5e7eb',
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Search foods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: '#111827',
              backgroundColor: 'transparent',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Chips: Purine Level ─────────────────────────────── */}
      <div style={{ padding: '12px 0 0' }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '0 16px 4px',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {LEVEL_FILTERS.map((lf) => {
            const isActive = selectedLevel === lf.key;
            return (
              <button
                key={lf.key}
                onClick={() => setSelectedLevel(lf.key)}
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: isActive ? '1.5px solid #1a56db' : '1.5px solid #d1d5db',
                  backgroundColor: isActive ? '#1a56db' : '#fff',
                  color: isActive ? '#fff' : '#374151',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {lf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter Chips: Category ─────────────────────────────────── */}
      <div style={{ padding: '6px 0 0' }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '0 16px 4px',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: isActive ? '1.5px solid #1a56db' : '1.5px solid #d1d5db',
                  backgroundColor: isActive ? '#eef2ff' : '#fff',
                  color: isActive ? '#1a56db' : '#374151',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results Count ──────────────────────────────────────────── */}
      <div style={{ padding: '10px 16px 4px' }}>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          Showing {visibleCount} of {totalCount} foods
        </span>
      </div>

      {/* ── Food List ──────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 16px 100px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {visibleFoods.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              color: '#9ca3af',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 12px', display: 'block' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: '#6b7280' }}>
              No foods found
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              Try adjusting your search or filters.
            </p>
          </div>
        )}

        {visibleFoods.map((food) => (
          <FoodListItem key={food.id} food={food} onSelect={setSelectedFood} />
        ))}

        {/* Paywall card for free users when results are gated */}
        {isGated && <PaywallCard />}
      </div>

      {/* ── Food Detail Modal ─────────────────────────────────────── */}
      {selectedFood && (
        <FoodDetailModal food={selectedFood} onClose={() => setSelectedFood(null)} />
      )}

      {/* ── Bottom Navigation Bar ─────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingTop: 8,
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          zIndex: 90,
        }}
      >
        {[
          { icon: <HomeIcon />, label: 'Home', path: '/' },
          { icon: <CameraIcon />, label: 'Scan', path: '/scan' },
          { icon: <DatabaseIcon active />, label: 'Database', path: '/database' },
          { icon: <ChartIcon />, label: 'Tracking', path: '/uric-acid' },
          { icon: <SettingsIcon />, label: 'Settings', path: '/settings' },
        ].map((tab) => {
          const isActive = tab.path === '/database';
          return (
            <button
              key={tab.path}
              onClick={() => {
                if (!isActive) router.push(tab.path);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 12px',
                color: isActive ? '#1a56db' : '#9ca3af',
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Inline keyframe for modal animation ───────────────────── */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
