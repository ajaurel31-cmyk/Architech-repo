'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { secureGet, secureSet } from '@/app/lib/secure-storage'
import { validateMedications, type Medication } from '@/app/lib/validation'

interface PushConfig {
  vapidPublicKey: string
  configured: boolean
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [editingMed, setEditingMed] = useState<Medication | null>(null)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null)
  const [pushConfig, setPushConfig] = useState<PushConfig | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  // Form state
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    times: ['08:00'],
    notes: '',
    withFood: false,
  })

  // Common transplant medications
  const commonMedications = [
    'Tacrolimus (Prograf)',
    'Cyclosporine (Neoral)',
    'Mycophenolate (CellCept)',
    'Prednisone',
    'Sirolimus (Rapamune)',
    'Azathioprine (Imuran)',
  ]

  useEffect(() => {
    // Load medications from secure storage
    const saved = secureGet<Medication[]>('medications', [])
    const validation = validateMedications(saved)
    if (validation.valid) {
      setMedications(saved)
    } else {
      console.warn('Invalid medication data, using empty array:', validation.errors)
      setMedications([])
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }

    // Check if running on iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    // Check if push notifications are supported
    const pushAvailable = 'serviceWorker' in navigator && 'PushManager' in window
    setPushSupported(pushAvailable)

    // Get VAPID public key from server
    fetch('/api/push/subscribe')
      .then(res => res.json())
      .then(data => {
        if (data.configured) {
          setPushConfig(data)
        }
      })
      .catch(err => console.log('Push config not available:', err))

    // Check existing push subscription
    if (pushAvailable) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setPushSubscription(subscription)
        })
      })
    }
  }, [])

  useEffect(() => {
    // Save medications to secure storage
    secureSet('medications', medications)
  }, [medications])

  // Local notification fallback for when push isn't available
  const sendLocalNotification = useCallback((med: Medication) => {
    if (notificationPermission === 'granted') {
      new Notification(`Time to take ${med.name}`, {
        body: `Dosage: ${med.dosage}${med.withFood ? '\nTake with food' : ''}${med.notes ? `\nNote: ${med.notes}` : ''}`,
        icon: '/icon-192.png',
        tag: med.id,
      })
    }
  }, [notificationPermission])

  useEffect(() => {
    // Set up reminder checks every minute (local fallback)
    const checkReminders = () => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      medications.forEach((med) => {
        if (med.times.includes(currentTime)) {
          sendLocalNotification(med)
        }
      })
    }

    const interval = setInterval(checkReminders, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [medications, sendLocalNotification])

  const requestNotificationPermission = async () => {
    try {
      if (!('Notification' in window)) {
        alert('Notifications not supported in this browser')
        return
      }

      const permission = await Notification.requestPermission()
      console.log('Permission result:', permission)
      setNotificationPermission(permission)

      if (permission === 'granted') {
        if (pushSupported && pushConfig?.vapidPublicKey) {
          await subscribeToPush()
        }
      } else if (permission === 'denied') {
        alert('Notifications were denied. Please enable in Safari Settings > Websites > Notifications')
      }
    } catch (error) {
      console.error('Notification permission error:', error)
      alert('Error requesting notification permission: ' + (error as Error).message)
    }
  }

  const subscribeToPush = async () => {
    if (!pushConfig?.vapidPublicKey) {
      console.log('Push not configured on server')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushConfig.vapidPublicKey)
      })

      setPushSubscription(subscription)

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      })

      console.log('Push subscription successful')
    } catch (error) {
      console.error('Push subscription failed:', error)
    }
  }

  const addMedication = () => {
    if (!newMed.name || !newMed.dosage) return

    const medication: Medication = {
      id: Date.now().toString(),
      name: newMed.name,
      dosage: newMed.dosage,
      times: newMed.times.filter((t) => t),
      notes: newMed.notes,
      withFood: newMed.withFood,
    }

    setMedications([...medications, medication])
    setNewMed({ name: '', dosage: '', times: ['08:00'], notes: '', withFood: false })
    setShowAddForm(false)
  }

  const updateMedication = () => {
    if (!editingMed) return

    setMedications(medications.map((m) => (m.id === editingMed.id ? editingMed : m)))
    setEditingMed(null)
  }

  const deleteMedication = (id: string) => {
    if (confirm('Are you sure you want to delete this medication?')) {
      setMedications(medications.filter((m) => m.id !== id))
    }
  }

  const addTimeSlot = () => {
    if (editingMed) {
      setEditingMed({ ...editingMed, times: [...editingMed.times, '12:00'] })
    } else {
      setNewMed({ ...newMed, times: [...newMed.times, '12:00'] })
    }
  }

  const removeTimeSlot = (index: number) => {
    if (editingMed) {
      const times = editingMed.times.filter((_, i) => i !== index)
      setEditingMed({ ...editingMed, times: times.length ? times : ['08:00'] })
    } else {
      const times = newMed.times.filter((_, i) => i !== index)
      setNewMed({ ...newMed, times: times.length ? times : ['08:00'] })
    }
  }

  const updateTime = (index: number, value: string) => {
    if (editingMed) {
      const times = [...editingMed.times]
      times[index] = value
      setEditingMed({ ...editingMed, times })
    } else {
      const times = [...newMed.times]
      times[index] = value
      setNewMed({ ...newMed, times })
    }
  }

  const testNotification = async () => {
    if (pushSubscription && pushConfig) {
      // Try sending via push API first
      try {
        const response = await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: pushSubscription.endpoint,
            title: 'Test Reminder',
            body: 'Push notifications are working! You will receive medication reminders.'
          })
        })

        if (response.ok) {
          return
        }
      } catch (error) {
        console.log('Push test failed, using local notification:', error)
      }
    }

    // Fallback to local notification
    if (notificationPermission === 'granted') {
      new Notification('Test Reminder', {
        body: 'Notifications are working! You will receive medication reminders.',
        icon: '/icon-192.png',
      })
    }
  }

  return (
    <main className="container">
      {/* Medical Disclaimer Banner */}
      <div className="disclaimer-banner warning">
        <strong>Important:</strong> This reminder tool is not a substitute for pharmacy or medical supervision. Missing immunosuppressants can cause organ rejection. Always maintain backup reminder systems. <Link href="/disclaimer">Read full disclaimer</Link>
      </div>

      <header className="header">
        <Link href="/" className="back-link">
          ← Back to Analyzer
        </Link>
        <h1>Medication Reminders</h1>
        <p>Never miss your post-transplant immunosuppressants</p>
      </header>

      <div className="card">
        {/* iOS PWA Instructions */}
        {isIOS && !isStandalone && (
          <div className="ios-install-prompt">
            <div className="ios-prompt-header" onClick={() => setShowIOSInstructions(!showIOSInstructions)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div>
                <h3>Install App for Push Notifications</h3>
                <p>Add to Home Screen to enable reminders on iPhone</p>
              </div>
              <svg className={`chevron ${showIOSInstructions ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {showIOSInstructions && (
              <div className="ios-instructions">
                <ol>
                  <li>Tap the <strong>Share</strong> button <span className="share-icon">⬆</span> at the bottom of Safari</li>
                  <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
                  <li>Tap <strong>&quot;Add&quot;</strong> in the top right corner</li>
                  <li>Open the app from your Home Screen</li>
                  <li>Enable notifications when prompted</li>
                </ol>
                <p className="ios-note">
                  <strong>Note:</strong> Push notifications on iOS require iOS 16.4 or later and the app must be installed to your Home Screen.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notification Permission */}
        <div className="notification-section">
          {notificationPermission === 'default' && (
            <div className="notification-prompt">
              <svg className="bell-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              <div>
                <h3>Enable Notifications</h3>
                <p>Get reminded when it&apos;s time to take your medications</p>
                {pushSupported && pushConfig?.configured && (
                  <span className="push-badge">Push notifications available</span>
                )}
              </div>
              <button className="enable-btn" onClick={requestNotificationPermission}>
                Enable
              </button>
            </div>
          )}
          {notificationPermission === 'granted' && (
            <div className="notification-enabled">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>
                Notifications enabled
                {pushSubscription && <span className="push-active"> (Push active)</span>}
              </span>
              <button className="test-btn" onClick={testNotification}>
                Test
              </button>
            </div>
          )}
          {notificationPermission === 'denied' && (
            <div className="notification-denied">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Notifications blocked. Enable in browser settings.</span>
            </div>
          )}
        </div>

        {/* Drug Interaction Warning */}
        <div className="drug-warning">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Important Drug Interactions
          </h3>
          <p>
            <strong>Avoid these foods/drinks</strong> while taking immunosuppressants:
          </p>
          <ul>
            <li>Herbal supplements</li>
            <li>Green tea (including matcha)</li>
            <li>All herbal teas (including Earl Grey)</li>
            <li>Grapefruit (including juice)</li>
            <li>Pomegranate (including juice)</li>
            <li>Dragonfruit/pitaya (including juice)</li>
            <li>Jackfruit</li>
            <li>Pomelo (including juice)</li>
            <li>Seville oranges (often in marmalade)</li>
            <li>Starfruit</li>
          </ul>
          <p className="warning-note">
            These can cause dangerous changes in medication levels in your blood.
          </p>
        </div>

        {/* Medications List */}
        <div className="medications-list">
          <div className="list-header">
            <h2>Your Medications</h2>
            <button className="add-btn" onClick={() => setShowAddForm(true)}>
              + Add
            </button>
          </div>

          {medications.length === 0 ? (
            <div className="empty-state">
              <svg className="pill-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                <path d="m8.5 8.5 7 7"/>
              </svg>
              <p>No medications added yet</p>
              <button className="add-first-btn" onClick={() => setShowAddForm(true)}>
                Add Your First Medication
              </button>
            </div>
          ) : (
            medications.map((med) => (
              <div key={med.id} className="medication-card">
                <div className="med-header">
                  <h3>{med.name}</h3>
                  <div className="med-actions">
                    <button className="edit-btn" onClick={() => setEditingMed(med)}>
                      Edit
                    </button>
                    <button className="delete-btn" onClick={() => deleteMedication(med.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                <p className="med-dosage">{med.dosage}</p>
                <div className="med-times">
                  {med.times.map((time, i) => (
                    <span key={i} className="time-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {time}
                    </span>
                  ))}
                </div>
                {med.withFood && (
                  <span className="food-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                      <path d="M7 2v20"/>
                      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
                    </svg>
                    Take with food
                  </span>
                )}
                {med.notes && <p className="med-notes">{med.notes}</p>}
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {(showAddForm || editingMed) && (
          <div className="modal-overlay" onClick={() => { setShowAddForm(false); setEditingMed(null); }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editingMed ? 'Edit Medication' : 'Add Medication'}</h2>

              <div className="form-group">
                <label>Medication Name</label>
                <input
                  type="text"
                  value={editingMed ? editingMed.name : newMed.name}
                  onChange={(e) =>
                    editingMed
                      ? setEditingMed({ ...editingMed, name: e.target.value })
                      : setNewMed({ ...newMed, name: e.target.value })
                  }
                  placeholder="e.g., Tacrolimus"
                  list="common-meds"
                />
                <datalist id="common-meds">
                  {commonMedications.map((med) => (
                    <option key={med} value={med} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Dosage</label>
                <input
                  type="text"
                  value={editingMed ? editingMed.dosage : newMed.dosage}
                  onChange={(e) =>
                    editingMed
                      ? setEditingMed({ ...editingMed, dosage: e.target.value })
                      : setNewMed({ ...newMed, dosage: e.target.value })
                  }
                  placeholder="e.g., 2mg twice daily"
                />
              </div>

              <div className="form-group">
                <label>Reminder Times</label>
                {(editingMed ? editingMed.times : newMed.times).map((time, index) => (
                  <div key={index} className="time-input-row">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(index, e.target.value)}
                    />
                    {(editingMed ? editingMed.times : newMed.times).length > 1 && (
                      <button
                        type="button"
                        className="remove-time-btn"
                        onClick={() => removeTimeSlot(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="add-time-btn" onClick={addTimeSlot}>
                  + Add Another Time
                </button>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingMed ? editingMed.withFood : newMed.withFood}
                    onChange={(e) =>
                      editingMed
                        ? setEditingMed({ ...editingMed, withFood: e.target.checked })
                        : setNewMed({ ...newMed, withFood: e.target.checked })
                    }
                  />
                  Take with food
                </label>
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={editingMed ? editingMed.notes : newMed.notes}
                  onChange={(e) =>
                    editingMed
                      ? setEditingMed({ ...editingMed, notes: e.target.value })
                      : setNewMed({ ...newMed, notes: e.target.value })
                  }
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingMed(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={editingMed ? updateMedication : addMedication}
                >
                  {editingMed ? 'Save Changes' : 'Add Medication'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}
