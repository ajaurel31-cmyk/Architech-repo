'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

interface MealRecommendation {
  id: string
  name: string
  description: string
  ingredients: string[]
  tips: string
  mealType: MealType
}

interface DailyMenu {
  date: string
  meals: Record<MealType, MealRecommendation[]>
}

export default function MealsPage() {
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([])
  const [favorites, setFavorites] = useState<MealRecommendation[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTodayKey = () => new Date().toISOString().split('T')[0]

  useEffect(() => {
    // Check if user has purchased the feature
    const purchased = localStorage.getItem('mealsPurchased')
    if (purchased === 'true') {
      setIsUnlocked(true)
    }

    // Load favorites
    const savedFavorites = localStorage.getItem('mealFavorites')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mealFavorites', JSON.stringify(favorites))
  }, [favorites])

  const handlePurchase = async () => {
    const confirmed = window.confirm(
      'Unlock Meal Recommendations for $4.99?\n\n' +
      'Get personalized kidney-safe meal ideas for breakfast, lunch, dinner, and snacks.'
    )

    if (confirmed) {
      localStorage.setItem('mealsPurchased', 'true')
      setIsUnlocked(true)
      alert('Purchase successful! You now have access to meal recommendations.')
    }
  }

  const generateMeals = async (mealType: MealType) => {
    setSelectedMeal(mealType)
    setShowFavorites(false)

    // Check for cached daily menu
    const todayKey = getTodayKey()
    const cachedMenu = localStorage.getItem(`dailyMenu_${todayKey}`)

    if (cachedMenu) {
      const menu: DailyMenu = JSON.parse(cachedMenu)
      if (menu.meals[mealType] && menu.meals[mealType].length > 0) {
        setRecommendations(menu.meals[mealType])
        return
      }
    }

    // Generate new meals
    setIsLoading(true)
    setError(null)
    setRecommendations([])

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate meals')
      }

      // Add IDs and mealType to each recommendation
      const mealsWithIds = data.meals.map((meal: Omit<MealRecommendation, 'id' | 'mealType'>, index: number) => ({
        ...meal,
        id: `${todayKey}_${mealType}_${index}`,
        mealType,
      }))

      setRecommendations(mealsWithIds)

      // Cache in daily menu
      const existingMenu = cachedMenu ? JSON.parse(cachedMenu) : { date: todayKey, meals: {} }
      existingMenu.meals[mealType] = mealsWithIds
      localStorage.setItem(`dailyMenu_${todayKey}`, JSON.stringify(existingMenu))

      // Clean up old cached menus (keep only today and yesterday)
      cleanOldMenus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const cleanOldMenus = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const keepKeys = [
      `dailyMenu_${today.toISOString().split('T')[0]}`,
      `dailyMenu_${yesterday.toISOString().split('T')[0]}`,
    ]

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('dailyMenu_') && !keepKeys.includes(key)) {
        localStorage.removeItem(key)
      }
    }
  }

  const toggleFavorite = (meal: MealRecommendation) => {
    const isFavorite = favorites.some((f) => f.id === meal.id)

    if (isFavorite) {
      setFavorites(favorites.filter((f) => f.id !== meal.id))
    } else {
      setFavorites([...favorites, meal])
    }
  }

  const isFavorite = (mealId: string) => favorites.some((f) => f.id === mealId)

  const refreshMeals = async () => {
    if (!selectedMeal) return

    // Clear cached meals for this type
    const todayKey = getTodayKey()
    const cachedMenu = localStorage.getItem(`dailyMenu_${todayKey}`)
    if (cachedMenu) {
      const menu: DailyMenu = JSON.parse(cachedMenu)
      delete menu.meals[selectedMeal]
      localStorage.setItem(`dailyMenu_${todayKey}`, JSON.stringify(menu))
    }

    // Generate new meals
    await generateMeals(selectedMeal)
  }

  const MealIcon = ({ type }: { type: MealType }) => {
    switch (type) {
      case 'breakfast':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4"/>
            <path d="m4.93 4.93 2.83 2.83"/>
            <path d="M2 12h4"/>
            <path d="m19.07 4.93-2.83 2.83"/>
            <path d="M22 12h-4"/>
            <path d="M12 12v8"/>
            <path d="M8 20h8"/>
          </svg>
        )
      case 'lunch':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2"/>
            <path d="M12 20v2"/>
            <path d="m4.93 4.93 1.41 1.41"/>
            <path d="m17.66 17.66 1.41 1.41"/>
            <path d="M2 12h2"/>
            <path d="M20 12h2"/>
            <path d="m6.34 17.66-1.41 1.41"/>
            <path d="m19.07 4.93-1.41 1.41"/>
          </svg>
        )
      case 'dinner':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
        )
      case 'snacks':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/>
            <path d="M10 2c1 .5 2 2 2 5"/>
          </svg>
        )
    }
  }

  const mealOptions: { type: MealType; label: string }[] = [
    { type: 'breakfast', label: 'Breakfast' },
    { type: 'lunch', label: 'Lunch' },
    { type: 'dinner', label: 'Dinner' },
    { type: 'snacks', label: 'Snacks' },
  ]

  return (
    <main className="container">
      {/* Medical Disclaimer Banner */}
      <div className="disclaimer-banner">
        <strong>Disclaimer:</strong> These meal suggestions are for informational purposes only. Always verify ingredients and consult your transplant dietitian before trying new recipes. <Link href="/disclaimer">Read full disclaimer</Link>
      </div>

      <header className="header">
        <Link href="/" className="back-link">← Back to Analyzer</Link>
        <h1>Meal Recommendations</h1>
        <p>Safe meal ideas for post-kidney transplant patients</p>
      </header>

      <div className="card">
        {!isUnlocked ? (
          <div className="paywall">
            <div className="paywall-icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                <path d="M7 2v20"/>
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
              </svg>
            </div>
            <h2>Unlock Meal Recommendations</h2>
            <p>Get personalized meal ideas tailored for post-kidney transplant patients.</p>
            <ul className="feature-list">
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Breakfast, lunch, dinner & snack ideas</li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Post-transplant-safe ingredients</li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Save your favorite meals</li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Daily menu stays consistent</li>
            </ul>
            <button className="purchase-btn" onClick={handlePurchase}>
              Unlock for $4.99
            </button>
            <p className="purchase-note">One-time purchase. No subscription.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="tabs">
              <button
                className={`tab-btn ${!showFavorites ? 'active' : ''}`}
                onClick={() => setShowFavorites(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Daily Menu
              </button>
              <button
                className={`tab-btn ${showFavorites ? 'active' : ''}`}
                onClick={() => setShowFavorites(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                Favorites {favorites.length > 0 && `(${favorites.length})`}
              </button>
            </div>

            {showFavorites ? (
              // Favorites Section
              <div className="favorites-section">
                {favorites.length === 0 ? (
                  <div className="empty-favorites">
                    <svg className="heart-empty" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                    <p>No favorites yet</p>
                    <p className="hint">Tap the heart on any meal to save it</p>
                  </div>
                ) : (
                  <div className="favorites-list">
                    {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((type) => {
                      const typeFavorites = favorites.filter((f) => f.mealType === type)
                      if (typeFavorites.length === 0) return null
                      return (
                        <div key={type} className="favorites-group">
                          <h3><MealIcon type={type} /> {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                          {typeFavorites.map((meal) => (
                            <div key={meal.id} className="meal-card">
                              <div className="meal-card-header">
                                <h4>{meal.name}</h4>
                                <button
                                  className="favorite-btn active"
                                  onClick={() => toggleFavorite(meal)}
                                  aria-label="Remove from favorites"
                                >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                                  </svg>
                                </button>
                              </div>
                              <p className="meal-description">{meal.description}</p>
                              <div className="ingredients">
                                <strong>Key Ingredients:</strong>
                                <ul>
                                  {meal.ingredients.map((ing, i) => (
                                    <li key={i}>{ing}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="meal-tips">
                                <strong>Post-Transplant Tip:</strong> {meal.tips}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Daily Menu Section
              <>
                <div className="daily-info">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Today&apos;s menu - {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>

                <h2 className="section-title">Choose a Meal Type</h2>
                <div className="meal-grid">
                  {mealOptions.map((meal) => (
                    <button
                      key={meal.type}
                      className={`meal-option ${selectedMeal === meal.type ? 'selected' : ''}`}
                      onClick={() => generateMeals(meal.type)}
                      disabled={isLoading}
                    >
                      <span className="meal-icon"><MealIcon type={meal.type} /></span>
                      <span className="meal-label">{meal.label}</span>
                    </button>
                  ))}
                </div>

                {isLoading && (
                  <div className="loading-section">
                    <span className="spinner"></span>
                    <p>Generating post-transplant-safe {selectedMeal} ideas...</p>
                  </div>
                )}

                {error && <div className="error-message">{error}</div>}

                {recommendations.length > 0 && (
                  <div className="recommendations">
                    <div className="recommendations-header">
                      <h3>
                        {selectedMeal?.charAt(0).toUpperCase()}{selectedMeal?.slice(1)} Options
                      </h3>
                      <button className="refresh-btn" onClick={refreshMeals} disabled={isLoading}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                          <path d="M21 3v5h-5"/>
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                          <path d="M8 16H3v5"/>
                        </svg>
                        New Ideas
                      </button>
                    </div>
                    {recommendations.map((meal) => (
                      <div key={meal.id} className="meal-card">
                        <div className="meal-card-header">
                          <h4>{meal.name}</h4>
                          <button
                            className={`favorite-btn ${isFavorite(meal.id) ? 'active' : ''}`}
                            onClick={() => toggleFavorite(meal)}
                            aria-label={isFavorite(meal.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite(meal.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                            </svg>
                          </button>
                        </div>
                        <p className="meal-description">{meal.description}</p>
                        <div className="ingredients">
                          <strong>Key Ingredients:</strong>
                          <ul>
                            {meal.ingredients.map((ing, i) => (
                              <li key={i}>{ing}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="meal-tips">
                          <strong>Post-Transplant Tip:</strong> {meal.tips}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
