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

  const mealOptions: { type: MealType; icon: string; label: string }[] = [
    { type: 'breakfast', icon: '🌅', label: 'Breakfast' },
    { type: 'lunch', icon: '☀️', label: 'Lunch' },
    { type: 'dinner', icon: '🌙', label: 'Dinner' },
    { type: 'snacks', icon: '🍎', label: 'Snacks' },
  ]

  const getMealTypeIcon = (type: MealType) => {
    return mealOptions.find((m) => m.type === type)?.icon || '🍽️'
  }

  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="back-link">← Back to Analyzer</Link>
        <h1>Meal Recommendations</h1>
        <p>Kidney-safe meal ideas for transplant patients</p>
      </header>

      <div className="card">
        {!isUnlocked ? (
          <div className="paywall">
            <div className="paywall-icon">🍽️</div>
            <h2>Unlock Meal Recommendations</h2>
            <p>Get personalized kidney-safe meal ideas tailored for transplant patients.</p>
            <ul className="feature-list">
              <li>✓ Breakfast, lunch, dinner & snack ideas</li>
              <li>✓ Transplant-safe ingredients</li>
              <li>✓ Save your favorite meals</li>
              <li>✓ Daily menu stays consistent</li>
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
                className={`tab ${!showFavorites ? 'active' : ''}`}
                onClick={() => setShowFavorites(false)}
              >
                Daily Menu
              </button>
              <button
                className={`tab ${showFavorites ? 'active' : ''}`}
                onClick={() => setShowFavorites(true)}
              >
                Favorites {favorites.length > 0 && `(${favorites.length})`}
              </button>
            </div>

            {showFavorites ? (
              // Favorites Section
              <div className="favorites-section">
                {favorites.length === 0 ? (
                  <div className="empty-favorites">
                    <span className="heart-empty">♡</span>
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
                          <h3>{getMealTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                          {typeFavorites.map((meal) => (
                            <div key={meal.id} className="meal-card">
                              <div className="meal-card-header">
                                <h4>{meal.name}</h4>
                                <button
                                  className="favorite-btn active"
                                  onClick={() => toggleFavorite(meal)}
                                  aria-label="Remove from favorites"
                                >
                                  ❤️
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
                                <strong>Transplant Tip:</strong> {meal.tips}
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
                  <span className="calendar-icon">📅</span>
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
                      <span className="meal-icon">{meal.icon}</span>
                      <span className="meal-label">{meal.label}</span>
                    </button>
                  ))}
                </div>

                {isLoading && (
                  <div className="loading-section">
                    <span className="spinner"></span>
                    <p>Generating kidney-safe {selectedMeal} ideas...</p>
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
                        🔄 New Ideas
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
                            {isFavorite(meal.id) ? '❤️' : '♡'}
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
                          <strong>Transplant Tip:</strong> {meal.tips}
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
