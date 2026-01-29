'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Medication {
  id: string
  name: string
  dosage: string
  times: string[]
  notes: string
  withFood: boolean
}

interface ReminderTime {
  hour: number
  minute: number
  enabled: boolean
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [editingMed, setEditingMed] = useState<Medication | null>(null)

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
    // Load medications from localStorage
    const saved = localStorage.getItem('medications')
    if (saved) {
      setMedications(JSON.parse(saved))
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    // Save medications to localStorage
    localStorage.setItem('medications', JSON.stringify(medications))
  }, [medications])

  useEffect(() => {
    // Set up reminder checks every minute
    const checkReminders = () => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      medications.forEach((med) => {
        if (med.times.includes(currentTime)) {
          sendNotification(med)
        }
      })
    }

    const interval = setInterval(checkReminders, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [medications])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  const sendNotification = (med: Medication) => {
    if (notificationPermission === 'granted') {
      new Notification(`Time to take ${med.name}`, {
        body: `Dosage: ${med.dosage}${med.withFood ? '\nTake with food' : ''}${med.notes ? `\nNote: ${med.notes}` : ''}`,
        icon: '/icon-192.png',
        tag: med.id,
      })
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

  const testNotification = () => {
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
        {/* Notification Permission */}
        <div className="notification-section">
          {notificationPermission === 'default' && (
            <div className="notification-prompt">
              <span className="bell-icon">🔔</span>
              <div>
                <h3>Enable Notifications</h3>
                <p>Get reminded when it&apos;s time to take your medications</p>
              </div>
              <button className="enable-btn" onClick={requestNotificationPermission}>
                Enable
              </button>
            </div>
          )}
          {notificationPermission === 'granted' && (
            <div className="notification-enabled">
              <span>✅ Notifications enabled</span>
              <button className="test-btn" onClick={testNotification}>
                Test
              </button>
            </div>
          )}
          {notificationPermission === 'denied' && (
            <div className="notification-denied">
              <span>⚠️ Notifications blocked. Enable in browser settings.</span>
            </div>
          )}
        </div>

        {/* Drug Interaction Warning */}
        <div className="drug-warning">
          <h3>⚠️ Important Drug Interactions</h3>
          <p>
            <strong>Avoid these foods</strong> while taking immunosuppressants:
          </p>
          <ul>
            <li>Grapefruit and grapefruit juice</li>
            <li>Pomelo and pomelo juice</li>
            <li>Seville oranges (often in marmalade)</li>
            <li>Starfruit</li>
          </ul>
          <p className="warning-note">
            These can cause dangerous increases in medication levels in your blood.
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
              <span className="pill-icon">💊</span>
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
                      🕐 {time}
                    </span>
                  ))}
                </div>
                {med.withFood && <span className="food-badge">🍽️ Take with food</span>}
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
