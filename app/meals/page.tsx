'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

interface MealRecommendation {
  name: string
  description: string
  ingredients: string[]
  tips: string
}

export default function MealsPage() {
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user has purchased the feature
    const purchased = localStorage.getItem('mealsPurchased')
    if (purchased === 'true') {
      setIsUnlocked(true)
    }
  }, [])

  const handlePurchase = async () => {
    // In production, this would integrate with Stripe or App Store IAP
    // For now, simulate a purchase flow
    const confirmed = window.confirm(
      'Unlock Meal Recommendations for $4.99?\n\n' +
      'Get personalized kidney-safe meal ideas for breakfast, lunch, dinner, and snacks.'
    )

    if (confirmed) {
      // Simulate purchase success
      localStorage.setItem('mealsPurchased', 'true')
      setIsUnlocked(true)
      alert('Purchase successful! You now have access to meal recommendations.')
    }
  }

  const generateMeals = async (mealType: MealType) => {
    setSelectedMeal(mealType)
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

      setRecommendations(data.meals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const mealOptions: { type: MealType; icon: string; label: string }[] = [
    { type: 'breakfast', icon: '🌅', label: 'Breakfast' },
    { type: 'lunch', icon: '☀️', label: 'Lunch' },
    { type: 'dinner', icon: '🌙', label: 'Dinner' },
    { type: 'snacks', icon: '🍎', label: 'Snacks' },
  ]

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
              <li>✓ Easy-to-follow recipes</li>
              <li>✓ Nutritional guidance</li>
            </ul>
            <button className="purchase-btn" onClick={handlePurchase}>
              Unlock for $4.99
            </button>
            <p className="purchase-note">One-time purchase. No subscription.</p>
          </div>
        ) : (
          <>
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
                <h3>Recommended {selectedMeal?.charAt(0).toUpperCase()}{selectedMeal?.slice(1)} Options</h3>
                {recommendations.map((meal, index) => (
                  <div key={index} className="meal-card">
                    <h4>{meal.name}</h4>
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
      </div>
    </main>
  )
}
