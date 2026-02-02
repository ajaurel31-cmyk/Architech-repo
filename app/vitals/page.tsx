'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { secureGet, secureSet } from '@/app/lib/secure-storage'
import { purchaseHealthVitals, restorePurchases, isHealthVitalsUnlocked, initializeStoreKit } from '@/app/lib/storekit'

// Dynamically import recharts to avoid SSR issues
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false })

type TimeOfDay = 'morning' | 'afternoon' | 'bedtime'

interface VitalReading {
  id: string
  date: string // YYYY-MM-DD
  timeOfDay: TimeOfDay
  timestamp: string
  systolic?: number
  diastolic?: number
  glucose?: number
  notes?: string
}

interface ReminderSettings {
  enabled: boolean
  morning: string // HH:MM
  afternoon: string
  bedtime: string
}

const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  morning: '07:00',
  afternoon: '14:00',
  bedtime: '21:00'
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  bedtime: 'Bedtime'
}

export default function VitalsPage() {
  const [readings, setReadings] = useState<VitalReading[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>('morning')
  const [reminders, setReminders] = useState<ReminderSettings>(DEFAULT_REMINDERS)
  const [activeTab, setActiveTab] = useState<'log' | 'chart' | 'settings'>('log')
  const [isPurchasing, setIsPurchasing] = useState(false)

  // Form state
  const [newReading, setNewReading] = useState({
    systolic: '',
    diastolic: '',
    glucose: '',
    notes: ''
  })

  // Load data on mount
  useEffect(() => {
    const savedReadings = secureGet<VitalReading[]>('vitalReadings', [])
    setReadings(savedReadings)

    const savedReminders = secureGet<ReminderSettings>('vitalsReminders', DEFAULT_REMINDERS)
    setReminders(savedReminders)

    // Initialize RevenueCat and check entitlements
    const initPurchases = async () => {
      await initializeStoreKit()
      const hasAccess = await isHealthVitalsUnlocked()
      setIsPremium(hasAccess)

      // Also check local storage as fallback
      if (!hasAccess) {
        const savedPremium = secureGet<boolean>('vitalsPremium', false)
        setIsPremium(savedPremium)
      }
    }
    initPurchases()
  }, [])

  // Save readings when they change
  useEffect(() => {
    if (readings.length > 0) {
      secureSet('vitalReadings', readings)
    }
  }, [readings])

  // Save reminders when they change
  useEffect(() => {
    secureSet('vitalsReminders', reminders)
  }, [reminders])

  // Reminder check
  const checkReminders = useCallback(() => {
    if (!reminders.enabled) return

    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    if (currentTime === reminders.morning) {
      alert('🩺 Morning Vitals Reminder\n\nTime to check your blood pressure and glucose!')
    } else if (currentTime === reminders.afternoon) {
      alert('🩺 Afternoon Vitals Reminder\n\nTime to check your blood pressure and glucose!')
    } else if (currentTime === reminders.bedtime) {
      alert('🩺 Bedtime Vitals Reminder\n\nTime to check your blood pressure and glucose!')
    }
  }, [reminders])

  useEffect(() => {
    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  }, [checkReminders])

  // Get today's readings
  const getTodayReadings = () => {
    const today = new Date().toISOString().split('T')[0]
    return readings.filter(r => r.date === today)
  }

  // Get readings for selected date
  const getDateReadings = (date: string) => {
    return readings.filter(r => r.date === date)
  }

  // Get weekly data for charts
  const getWeeklyData = () => {
    const today = new Date()
    const weekData = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayReadings = readings.filter(r => r.date === dateStr)

      const avgSystolic = dayReadings.filter(r => r.systolic).reduce((sum, r) => sum + (r.systolic || 0), 0) / (dayReadings.filter(r => r.systolic).length || 1)
      const avgDiastolic = dayReadings.filter(r => r.diastolic).reduce((sum, r) => sum + (r.diastolic || 0), 0) / (dayReadings.filter(r => r.diastolic).length || 1)
      const avgGlucose = dayReadings.filter(r => r.glucose).reduce((sum, r) => sum + (r.glucose || 0), 0) / (dayReadings.filter(r => r.glucose).length || 1)

      weekData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: dateStr,
        systolic: dayReadings.filter(r => r.systolic).length > 0 ? Math.round(avgSystolic) : null,
        diastolic: dayReadings.filter(r => r.diastolic).length > 0 ? Math.round(avgDiastolic) : null,
        glucose: dayReadings.filter(r => r.glucose).length > 0 ? Math.round(avgGlucose) : null,
      })
    }

    return weekData
  }

  // Calculate weekly averages
  const getWeeklyAverages = () => {
    const weekData = getWeeklyData()
    const validSystolic = weekData.filter(d => d.systolic !== null)
    const validDiastolic = weekData.filter(d => d.diastolic !== null)
    const validGlucose = weekData.filter(d => d.glucose !== null)

    return {
      systolic: validSystolic.length > 0
        ? Math.round(validSystolic.reduce((sum, d) => sum + (d.systolic || 0), 0) / validSystolic.length)
        : null,
      diastolic: validDiastolic.length > 0
        ? Math.round(validDiastolic.reduce((sum, d) => sum + (d.diastolic || 0), 0) / validDiastolic.length)
        : null,
      glucose: validGlucose.length > 0
        ? Math.round(validGlucose.reduce((sum, d) => sum + (d.glucose || 0), 0) / validGlucose.length)
        : null,
    }
  }

  // Add a new reading
  const addReading = () => {
    if (!newReading.systolic && !newReading.diastolic && !newReading.glucose) {
      alert('Please enter at least one measurement')
      return
    }

    const reading: VitalReading = {
      id: Date.now().toString(),
      date: selectedDate,
      timeOfDay: selectedTimeOfDay,
      timestamp: new Date().toISOString(),
      systolic: newReading.systolic ? parseInt(newReading.systolic) : undefined,
      diastolic: newReading.diastolic ? parseInt(newReading.diastolic) : undefined,
      glucose: newReading.glucose ? parseInt(newReading.glucose) : undefined,
      notes: newReading.notes || undefined
    }

    setReadings([...readings, reading])
    setNewReading({ systolic: '', diastolic: '', glucose: '', notes: '' })
    setShowAddForm(false)
  }

  // Delete a reading
  const deleteReading = (id: string) => {
    if (confirm('Delete this reading?')) {
      setReadings(readings.filter(r => r.id !== id))
    }
  }

  // Handle premium unlock
  const handleUnlock = async () => {
    setIsPurchasing(true)
    try {
      const result = await purchaseHealthVitals()
      if (result.success) {
        setIsPremium(true)
        secureSet('vitalsPremium', true)
        setShowPaywall(false)
        alert('Thank you for your purchase! Health Vitals is now unlocked.')
      } else if (result.error && result.error !== 'User cancelled') {
        alert(`Purchase failed: ${result.error}`)
      }
    } catch (error) {
      alert('Purchase failed. Please try again.')
    } finally {
      setIsPurchasing(false)
    }
  }

  // Restore purchase
  const handleRestore = async () => {
    setIsPurchasing(true)
    try {
      const result = await restorePurchases()
      if (result.success && result.hasHealthVitals) {
        setIsPremium(true)
        secureSet('vitalsPremium', true)
        alert('Purchase restored successfully!')
      } else if (result.success) {
        alert('No previous purchase found.')
      } else {
        alert(`Restore failed: ${result.error}`)
      }
    } catch (error) {
      alert('Restore failed. Please try again.')
    } finally {
      setIsPurchasing(false)
    }
  }

  // Get BP status color
  const getBPStatus = (systolic: number, diastolic: number) => {
    if (systolic < 120 && diastolic < 80) return { status: 'Normal', color: '#22c55e' }
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', color: '#eab308' }
    if (systolic < 140 || diastolic < 90) return { status: 'High (Stage 1)', color: '#f97316' }
    return { status: 'High (Stage 2)', color: '#ef4444' }
  }

  // Get glucose status
  const getGlucoseStatus = (glucose: number, timeOfDay: TimeOfDay) => {
    if (timeOfDay === 'morning') {
      // Fasting glucose
      if (glucose < 100) return { status: 'Normal', color: '#22c55e' }
      if (glucose < 126) return { status: 'Prediabetic', color: '#eab308' }
      return { status: 'Diabetic Range', color: '#ef4444' }
    } else {
      // Post-meal (approximate)
      if (glucose < 140) return { status: 'Normal', color: '#22c55e' }
      if (glucose < 200) return { status: 'Elevated', color: '#eab308' }
      return { status: 'High', color: '#ef4444' }
    }
  }

  const weeklyAverages = getWeeklyAverages()
  const todayReadings = getTodayReadings()

  // Show paywall if not premium
  if (!isPremium) {
    return (
      <main className="container">
        <header className="header">
          <Link href="/" className="back-link">
            ← Back to Home
          </Link>
          <h1>Health Vitals</h1>
          <p>Track your blood pressure and glucose</p>
        </header>

        <div className="card paywall-card">
          <div className="paywall-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <h2>Unlock Health Vitals</h2>
          <p className="paywall-description">
            Track your blood pressure and glucose levels with powerful features designed for transplant patients.
          </p>

          <ul className="paywall-features">
            <li>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Log BP & Glucose 3x daily
            </li>
            <li>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Morning, Afternoon & Bedtime reminders
            </li>
            <li>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Visual charts & trends
            </li>
            <li>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Weekly averages
            </li>
            <li>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Health status indicators
            </li>
          </ul>

          <div className="paywall-price">
            <span className="price">$4.99</span>
            <span className="price-note">One-time purchase</span>
          </div>

          <button className="unlock-btn" onClick={handleUnlock} disabled={isPurchasing}>
            {isPurchasing ? 'Processing...' : 'Unlock Now - $4.99'}
          </button>

          <button className="restore-btn" onClick={handleRestore} disabled={isPurchasing}>
            {isPurchasing ? 'Restoring...' : 'Restore Purchase'}
          </button>

          <p className="paywall-note">
            Your data is stored locally on your device and never shared.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="back-link">
          ← Back to Home
        </Link>
        <h1>Health Vitals</h1>
        <p>Track your blood pressure and glucose</p>
      </header>

      {/* Disclaimer Banner */}
      <div className="disclaimer-banner warning">
        <strong>Important:</strong> This tool is for tracking only. Always consult your healthcare provider for medical advice. <Link href="/disclaimer">Read disclaimer</Link>
      </div>

      {/* Tab Navigation */}
      <div className="vitals-tabs">
        <button
          className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          Log
        </button>
        <button
          className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          Charts
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Weekly Averages Card */}
      <div className="card weekly-averages">
        <h3>Weekly Averages</h3>
        <div className="averages-grid">
          <div className="average-item">
            <span className="average-label">Blood Pressure</span>
            <span className="average-value">
              {weeklyAverages.systolic && weeklyAverages.diastolic
                ? `${weeklyAverages.systolic}/${weeklyAverages.diastolic}`
                : '--/--'}
            </span>
            <span className="average-unit">mmHg</span>
          </div>
          <div className="average-item">
            <span className="average-label">Glucose</span>
            <span className="average-value">
              {weeklyAverages.glucose || '--'}
            </span>
            <span className="average-unit">mg/dL</span>
          </div>
        </div>
      </div>

      {/* Log Tab */}
      {activeTab === 'log' && (
        <div className="card">
          <div className="log-header">
            <h3>Today&apos;s Readings</h3>
            <button className="add-btn" onClick={() => setShowAddForm(true)}>
              + Add Reading
            </button>
          </div>

          {/* Today's entries by time of day */}
          <div className="daily-slots">
            {(['morning', 'afternoon', 'bedtime'] as TimeOfDay[]).map(timeOfDay => {
              const reading = todayReadings.find(r => r.timeOfDay === timeOfDay)
              return (
                <div key={timeOfDay} className={`time-slot ${reading ? 'filled' : 'empty'}`}>
                  <div className="slot-header">
                    <span className="slot-time">{TIME_LABELS[timeOfDay]}</span>
                    {!reading && (
                      <button
                        className="quick-add-btn"
                        onClick={() => {
                          setSelectedTimeOfDay(timeOfDay)
                          setSelectedDate(new Date().toISOString().split('T')[0])
                          setShowAddForm(true)
                        }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  {reading ? (
                    <div className="slot-content">
                      {reading.systolic && reading.diastolic && (
                        <div className="reading-row">
                          <span className="reading-label">BP:</span>
                          <span
                            className="reading-value"
                            style={{ color: getBPStatus(reading.systolic, reading.diastolic).color }}
                          >
                            {reading.systolic}/{reading.diastolic}
                          </span>
                          <span className="reading-status">
                            {getBPStatus(reading.systolic, reading.diastolic).status}
                          </span>
                        </div>
                      )}
                      {reading.glucose && (
                        <div className="reading-row">
                          <span className="reading-label">Glucose:</span>
                          <span
                            className="reading-value"
                            style={{ color: getGlucoseStatus(reading.glucose, timeOfDay).color }}
                          >
                            {reading.glucose}
                          </span>
                          <span className="reading-status">
                            {getGlucoseStatus(reading.glucose, timeOfDay).status}
                          </span>
                        </div>
                      )}
                      {reading.notes && (
                        <p className="reading-notes">{reading.notes}</p>
                      )}
                      <button
                        className="delete-reading-btn"
                        onClick={() => deleteReading(reading.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <p className="slot-empty-text">No reading yet</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'chart' && (
        <div className="card">
          <h3>7-Day Blood Pressure Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getWeeklyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={[60, 180]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444' }}
                  name="Systolic"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                  name="Diastolic"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{ marginTop: '2rem' }}>7-Day Glucose Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getWeeklyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={[60, 200]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="glucose"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                  name="Glucose (mg/dL)"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* BP Reference */}
          <div className="reference-card">
            <h4>Blood Pressure Reference</h4>
            <div className="reference-items">
              <div className="ref-item">
                <span className="ref-color" style={{ background: '#22c55e' }}></span>
                <span>Normal: &lt;120/80</span>
              </div>
              <div className="ref-item">
                <span className="ref-color" style={{ background: '#eab308' }}></span>
                <span>Elevated: 120-129/&lt;80</span>
              </div>
              <div className="ref-item">
                <span className="ref-color" style={{ background: '#f97316' }}></span>
                <span>High Stage 1: 130-139/80-89</span>
              </div>
              <div className="ref-item">
                <span className="ref-color" style={{ background: '#ef4444' }}></span>
                <span>High Stage 2: 140+/90+</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card">
          <h3>Reminder Settings</h3>

          <div className="setting-row">
            <label className="setting-label">
              <span>Enable Reminders</span>
              <input
                type="checkbox"
                checked={reminders.enabled}
                onChange={(e) => setReminders({ ...reminders, enabled: e.target.checked })}
              />
            </label>
          </div>

          {reminders.enabled && (
            <>
              <div className="setting-row">
                <label className="setting-label">
                  <span>Morning</span>
                  <input
                    type="time"
                    value={reminders.morning}
                    onChange={(e) => setReminders({ ...reminders, morning: e.target.value })}
                  />
                </label>
              </div>
              <div className="setting-row">
                <label className="setting-label">
                  <span>Afternoon</span>
                  <input
                    type="time"
                    value={reminders.afternoon}
                    onChange={(e) => setReminders({ ...reminders, afternoon: e.target.value })}
                  />
                </label>
              </div>
              <div className="setting-row">
                <label className="setting-label">
                  <span>Bedtime</span>
                  <input
                    type="time"
                    value={reminders.bedtime}
                    onChange={(e) => setReminders({ ...reminders, bedtime: e.target.value })}
                  />
                </label>
              </div>
            </>
          )}

          <div className="setting-section">
            <h4>Data Management</h4>
            <button
              className="danger-btn"
              onClick={() => {
                if (confirm('Delete all vitals data? This cannot be undone.')) {
                  setReadings([])
                  secureSet('vitalReadings', [])
                  alert('All data deleted.')
                }
              }}
            >
              Delete All Data
            </button>
          </div>
        </div>
      )}

      {/* Add Reading Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Reading</h2>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Time of Day</label>
              <select
                value={selectedTimeOfDay}
                onChange={(e) => setSelectedTimeOfDay(e.target.value as TimeOfDay)}
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="bedtime">Bedtime</option>
              </select>
            </div>

            <div className="form-section">
              <h4>Blood Pressure</h4>
              <div className="bp-inputs">
                <div className="form-group">
                  <label>Systolic (top)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={newReading.systolic}
                    onChange={(e) => setNewReading({ ...newReading, systolic: e.target.value })}
                    min="60"
                    max="250"
                  />
                </div>
                <div className="form-group">
                  <label>Diastolic (bottom)</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={newReading.diastolic}
                    onChange={(e) => setNewReading({ ...newReading, diastolic: e.target.value })}
                    min="40"
                    max="150"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Glucose</h4>
              <div className="form-group">
                <label>Blood Glucose (mg/dL)</label>
                <input
                  type="number"
                  placeholder="100"
                  value={newReading.glucose}
                  onChange={(e) => setNewReading({ ...newReading, glucose: e.target.value })}
                  min="20"
                  max="600"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                placeholder="Any notes about this reading..."
                value={newReading.notes}
                onChange={(e) => setNewReading({ ...newReading, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={addReading}>
                Save Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
