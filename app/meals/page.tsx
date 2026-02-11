'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  isPremiumActive,
  canMakePurchases,
  purchaseMonthly,
  purchaseAnnual,
  restorePurchases,
} from '@/app/lib/storekit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Meal {
  id: string;
  name: string;
  purineLevel: 'Low' | 'Very Low' | 'Moderate';
  description: string;
  ingredients: string[];
  instructions: string[];
  goutTips: string[];
  mealType: string;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
type DietaryPreference = 'Standard' | 'Vegetarian' | 'Dairy-Free' | 'Gluten-Free';
type ViewTab = 'generate' | 'favorites';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
];

const DIETARY_PREFERENCES: DietaryPreference[] = [
  'Standard',
  'Vegetarian',
  'Dairy-Free',
  'Gluten-Free',
];

const FAVORITES_KEY = 'goutguard_favorite_meals';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateMealId(): string {
  return `meal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function loadFavorites(): Meal[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Meal[];
  } catch {
    return [];
  }
}

function saveFavorites(meals: Meal[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(meals));
  } catch {
    // Storage full or unavailable
  }
}

function getPurineBadgeStyle(level: string): React.CSSProperties {
  switch (level) {
    case 'Very Low':
      return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
    case 'Low':
      return { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' };
    case 'Moderate':
      return { backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 90,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    flexShrink: 0,
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  premiumBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  // -- Paywall --
  paywallOverlay: {
    padding: '32px 20px',
  },
  paywallCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: '32px 24px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  },
  paywallIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  paywallTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px',
    lineHeight: 1.3,
  },
  paywallSubtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: '0 0 24px',
    lineHeight: 1.5,
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 28px',
    textAlign: 'left' as const,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    fontSize: 14,
    color: '#334155',
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 700,
  },
  monthlyBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#1a56db',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 10,
  },
  annualBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: 12,
    border: '2px solid #1a56db',
    backgroundColor: '#ffffff',
    color: '#1a56db',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 16,
  },
  restoreLink: {
    fontSize: 13,
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 4,
  },
  webMessage: {
    fontSize: 13,
    color: '#64748b',
    margin: '16px 0 0',
    lineHeight: 1.5,
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  purchaseError: {
    fontSize: 13,
    color: '#dc2626',
    margin: '12px 0 0',
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  // -- View Tabs (Generate / Favorites) --
  viewTabs: {
    display: 'flex',
    padding: '12px 20px 0',
    gap: 0,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  viewTab: {
    flex: 1,
    padding: '10px 0 12px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'color 0.2s, border-color 0.2s',
  },
  viewTabActive: {
    color: '#1a56db',
    borderBottom: '2px solid #1a56db',
  },
  // -- Meal Type Tabs --
  mealTypeTabs: {
    display: 'flex',
    gap: 8,
    padding: '16px 20px 8px',
    overflowX: 'auto' as const,
  },
  mealTypeTab: {
    padding: '8px 18px',
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  mealTypeTabActive: {
    backgroundColor: '#1a56db',
    color: '#ffffff',
    border: '1px solid #1a56db',
  },
  // -- Dietary Preferences --
  dietarySection: {
    padding: '8px 20px 4px',
  },
  dietaryLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  dietaryChips: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  dietaryChip: {
    padding: '6px 14px',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dietaryChipActive: {
    backgroundColor: '#eff6ff',
    color: '#1a56db',
    border: '1px solid #93c5fd',
  },
  // -- Generate Button --
  generateSection: {
    padding: '12px 20px 8px',
  },
  generateBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#1a56db',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background-color 0.2s',
  },
  generateBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  // -- Meal Cards --
  mealsContainer: {
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  mealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: '18px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    border: '1px solid #f1f5f9',
  },
  mealCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.3,
    flex: 1,
  },
  purineBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 12,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  mealDescription: {
    fontSize: 14,
    color: '#64748b',
    margin: '0 0 12px',
    lineHeight: 1.5,
  },
  ingredientsLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    margin: '0 0 6px',
  },
  ingredientsList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    margin: '0 0 12px',
    padding: 0,
    listStyle: 'none',
  },
  ingredientTag: {
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    color: '#475569',
    border: '1px solid #e2e8f0',
  },
  expandBtn: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1a56db',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid #f1f5f9',
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px',
  },
  recipeStep: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.6,
    margin: '0 0 4px',
    paddingLeft: 4,
  },
  tipsSection: {
    marginTop: 14,
    padding: '12px 14px',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 6px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  tipItem: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 1.5,
    margin: '0 0 3px',
    paddingLeft: 4,
  },
  favoriteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  favoriteBtnActive: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
  },
  // -- Skeleton --
  skeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    border: '1px solid #f1f5f9',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonShort: {
    width: '60%',
  },
  skeletonMedium: {
    width: '80%',
  },
  skeletonFull: {
    width: '100%',
  },
  // -- Favorites Empty --
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 6px',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.5,
  },
  // -- Error --
  errorBanner: {
    margin: '12px 20px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    border: '1px solid #fecaca',
    fontSize: 13,
    color: '#dc2626',
    lineHeight: 1.5,
  },
  // -- Bottom Nav --
  bottomNav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 0 env(safe-area-inset-bottom, 8px)',
    zIndex: 100,
    maxWidth: 480,
    margin: '0 auto',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
    fontSize: 10,
    fontWeight: 500,
    color: '#94a3b8',
    textDecoration: 'none',
    padding: '4px 8px',
    borderRadius: 8,
  },
  navItemActive: {
    color: '#1a56db',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MealsPage() {
  const [premium, setPremium] = useState(false);
  const [nativePurchases, setNativePurchases] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTab>('generate');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>(['Standard']);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [favorites, setFavorites] = useState<Meal[]>([]);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // -- Initialize --
  useEffect(() => {
    setPremium(isPremiumActive());
    setNativePurchases(canMakePurchases());
    setFavorites(loadFavorites());
  }, []);

  // -- Toggle dietary preference --
  const toggleDietaryPreference = useCallback((pref: DietaryPreference) => {
    setDietaryPreferences((prev) => {
      if (prev.includes(pref)) {
        const next = prev.filter((p) => p !== pref);
        return next.length === 0 ? ['Standard'] : next;
      }
      return [...prev, pref];
    });
  }, []);

  // -- Toggle favorite --
  const toggleFavorite = useCallback((meal: Meal) => {
    setFavorites((prev) => {
      const exists = prev.some((m) => m.id === meal.id);
      let next: Meal[];
      if (exists) {
        next = prev.filter((m) => m.id !== meal.id);
      } else {
        next = [...prev, meal];
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  // -- Check if meal is favorited --
  const isFavorited = useCallback(
    (mealId: string) => favorites.some((m) => m.id === mealId),
    [favorites],
  );

  // -- Generate meals --
  const generateMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMeals([]);

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType,
          dietaryPreferences,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate meals (${res.status})`);
      }

      const data = await res.json();
      const mealsWithIds: Meal[] = (data.meals || []).map((m: Omit<Meal, 'id'>) => ({
        ...m,
        id: generateMealId(),
        mealType,
      }));
      setMeals(mealsWithIds);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate meal ideas. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [mealType, dietaryPreferences]);

  // -- Purchase handlers --
  const handlePurchaseMonthly = useCallback(async () => {
    setPurchaseLoading(true);
    setPurchaseError(null);
    const result = await purchaseMonthly();
    if (result.success) {
      setPremium(true);
    } else if (result.error) {
      setPurchaseError(result.error);
    }
    setPurchaseLoading(false);
  }, []);

  const handlePurchaseAnnual = useCallback(async () => {
    setPurchaseLoading(true);
    setPurchaseError(null);
    const result = await purchaseAnnual();
    if (result.success) {
      setPremium(true);
    } else if (result.error) {
      setPurchaseError(result.error);
    }
    setPurchaseLoading(false);
  }, []);

  const handleRestore = useCallback(async () => {
    setPurchaseLoading(true);
    setPurchaseError(null);
    const result = await restorePurchases();
    if (result.success && result.isPremium) {
      setPremium(true);
    } else if (result.error) {
      setPurchaseError(result.error);
    } else if (result.success && !result.isPremium) {
      setPurchaseError('No active subscription found. Please subscribe to access this feature.');
    }
    setPurchaseLoading(false);
  }, []);

  // -- Render Meal Card --
  const renderMealCard = (meal: Meal) => {
    const isExpanded = expandedMealId === meal.id;
    const isFav = isFavorited(meal.id);

    return (
      <div key={meal.id} style={styles.mealCard}>
        <div style={styles.mealCardHeader}>
          <h3 style={styles.mealName}>{meal.name}</h3>
          <span style={{ ...styles.purineBadge, ...getPurineBadgeStyle(meal.purineLevel) }}>
            {meal.purineLevel}
          </span>
          <button
            type="button"
            style={{ ...styles.favoriteBtn, ...(isFav ? styles.favoriteBtnActive : {}) }}
            onClick={() => toggleFavorite(meal)}
            aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isFav ? '#ef4444' : 'none'}
              stroke={isFav ? '#ef4444' : '#94a3b8'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <p style={styles.mealDescription}>{meal.description}</p>

        <p style={styles.ingredientsLabel}>Key Ingredients</p>
        <ul style={styles.ingredientsList}>
          {meal.ingredients.map((ing, idx) => (
            <li key={idx} style={styles.ingredientTag}>
              {ing}
            </li>
          ))}
        </ul>

        <button
          type="button"
          style={styles.expandBtn}
          onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
        >
          {isExpanded ? 'Hide Details' : 'View Recipe & Tips'}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isExpanded && (
          <div style={styles.expandedSection}>
            <p style={styles.recipeTitle}>Instructions</p>
            {meal.instructions.map((step, idx) => (
              <p key={idx} style={styles.recipeStep}>
                {idx + 1}. {step}
              </p>
            ))}

            {meal.goutTips.length > 0 && (
              <div style={styles.tipsSection}>
                <p style={styles.tipsTitle}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Gout-Friendly Tips
                </p>
                {meal.goutTips.map((tip, idx) => (
                  <p key={idx} style={styles.tipItem}>
                    {tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // -- Render Skeleton Loading Cards --
  const renderSkeletonCards = () => (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} style={styles.skeletonCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div
              style={{ ...styles.skeletonLine, ...styles.skeletonShort, marginBottom: 0, height: 18 }}
            />
            <div
              style={{
                ...styles.skeletonLine,
                width: 60,
                marginBottom: 0,
                height: 22,
                borderRadius: 12,
              }}
            />
          </div>
          <div style={{ ...styles.skeletonLine, ...styles.skeletonFull }} />
          <div style={{ ...styles.skeletonLine, ...styles.skeletonMedium }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {[70, 55, 80, 50].map((w, i) => (
              <div
                key={i}
                style={{
                  ...styles.skeletonLine,
                  width: w,
                  height: 26,
                  borderRadius: 8,
                  marginBottom: 0,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={styles.container}>
      {/* ---- Header ---- */}
      <header style={styles.header}>
        <Link href="/" style={styles.backButton} aria-label="Go back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#334155"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div style={styles.headerTitleWrap}>
          <h1 style={styles.headerTitle}>Meal Ideas</h1>
          <span style={styles.premiumBadge}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="#92400e"
              stroke="none"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Premium
          </span>
        </div>
      </header>

      {/* ---- Premium Gate ---- */}
      {!premium && (
        <div style={styles.paywallOverlay}>
          <div style={styles.paywallCard}>
            <div style={styles.paywallIcon}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a56db"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
            </div>
            <h2 style={styles.paywallTitle}>Unlock Personalized Meal Suggestions</h2>
            <p style={styles.paywallSubtitle}>
              Get AI-powered low-purine meal plans tailored to your dietary needs.
            </p>

            <ul style={styles.featureList}>
              {[
                'AI-generated low-purine meals',
                'Filtered by dietary preferences',
                'Detailed recipes with instructions',
                'Save your favorite meals',
              ].map((feature) => (
                <li key={feature} style={styles.featureItem}>
                  <span style={styles.featureCheck}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            {nativePurchases ? (
              <>
                <button
                  type="button"
                  style={{
                    ...styles.monthlyBtn,
                    ...(purchaseLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                  }}
                  onClick={handlePurchaseMonthly}
                  disabled={purchaseLoading}
                >
                  {purchaseLoading ? 'Processing...' : 'Subscribe to Premium \u2014 $4.99/month'}
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.annualBtn,
                    ...(purchaseLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                  }}
                  onClick={handlePurchaseAnnual}
                  disabled={purchaseLoading}
                >
                  {purchaseLoading ? 'Processing...' : 'Annual Plan \u2014 $29.99/year (Save 50%)'}
                </button>
                <button
                  type="button"
                  style={styles.restoreLink}
                  onClick={handleRestore}
                  disabled={purchaseLoading}
                >
                  Restore Purchases
                </button>
              </>
            ) : (
              <p style={styles.webMessage}>
                Download GoutGuard from the App Store to subscribe and unlock personalized meal
                suggestions.
              </p>
            )}

            {purchaseError && <p style={styles.purchaseError}>{purchaseError}</p>}
          </div>
        </div>
      )}

      {/* ---- Premium Content ---- */}
      {premium && (
        <>
          {/* View Tabs */}
          <div style={styles.viewTabs}>
            <button
              type="button"
              style={{
                ...styles.viewTab,
                ...(viewTab === 'generate' ? styles.viewTabActive : {}),
              }}
              onClick={() => setViewTab('generate')}
            >
              Generate Meals
            </button>
            <button
              type="button"
              style={{
                ...styles.viewTab,
                ...(viewTab === 'favorites' ? styles.viewTabActive : {}),
              }}
              onClick={() => setViewTab('favorites')}
            >
              Favorites ({favorites.length})
            </button>
          </div>

          {/* Generate Tab */}
          {viewTab === 'generate' && (
            <>
              {/* Meal Type Tabs */}
              <div style={styles.mealTypeTabs}>
                {MEAL_TYPES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    style={{
                      ...styles.mealTypeTab,
                      ...(mealType === key ? styles.mealTypeTabActive : {}),
                    }}
                    onClick={() => setMealType(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Dietary Preferences */}
              <div style={styles.dietarySection}>
                <p style={styles.dietaryLabel}>Dietary Preferences</p>
                <div style={styles.dietaryChips}>
                  {DIETARY_PREFERENCES.map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      style={{
                        ...styles.dietaryChip,
                        ...(dietaryPreferences.includes(pref) ? styles.dietaryChipActive : {}),
                      }}
                      onClick={() => toggleDietaryPreference(pref)}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div style={styles.generateSection}>
                <button
                  type="button"
                  style={{
                    ...styles.generateBtn,
                    ...(loading ? styles.generateBtnDisabled : {}),
                  }}
                  onClick={generateMeals}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                        style={{ animation: 'spin 1s linear infinite' }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Get Meal Ideas
                    </>
                  )}
                </button>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>

              {/* Error */}
              {error && <div style={styles.errorBanner}>{error}</div>}

              {/* Meal Cards */}
              <div style={styles.mealsContainer}>
                {loading && renderSkeletonCards()}
                {!loading && meals.length > 0 && meals.map(renderMealCard)}
                {!loading && meals.length === 0 && !error && (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                        <line x1="6" y1="1" x2="6" y2="4" />
                        <line x1="10" y1="1" x2="10" y2="4" />
                        <line x1="14" y1="1" x2="14" y2="4" />
                      </svg>
                    </div>
                    <p style={styles.emptyTitle}>Ready to discover gout-friendly meals</p>
                    <p style={styles.emptySubtitle}>
                      Select your meal type and dietary preferences, then tap &quot;Get Meal
                      Ideas&quot; to generate personalized low-purine suggestions.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Favorites Tab */}
          {viewTab === 'favorites' && (
            <div style={styles.mealsContainer}>
              {favorites.length > 0 ? (
                favorites.map(renderMealCard)
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <p style={styles.emptyTitle}>No favorite meals yet</p>
                  <p style={styles.emptySubtitle}>
                    Generate meal ideas and tap the heart icon to save your favorites here for quick
                    access.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ---- Bottom Navigation Bar ---- */}
      <nav style={styles.bottomNav}>
        <Link href="/" style={styles.navItem}>
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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </Link>
        <Link href="/scan" style={styles.navItem}>
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
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>Scan</span>
        </Link>
        <Link href="/database" style={styles.navItem}>
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
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span>Database</span>
        </Link>
        <Link href="/uric-acid" style={styles.navItem}>
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
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Track</span>
        </Link>
        <Link href="/settings" style={styles.navItem}>
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
