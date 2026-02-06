import { useState, useEffect, useCallback } from 'react'
import './PillTracker.css'

const STORAGE_KEY = 'pillTracker'
const MEDS_KEY = 'pillTrackerMeds'

function loadToday() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && saved.date === new Date().toDateString()) {
      return saved.taken
    }
  } catch { /* empty */ }
  return {}
}

function loadMeds() {
  try {
    return JSON.parse(localStorage.getItem(MEDS_KEY)) || []
  } catch {
    return []
  }
}

export default function PillTracker() {
  const [medications, setMedications] = useState(loadMeds)
  const [taken, setTaken] = useState(loadToday)
  const [newMedName, setNewMedName] = useState('')
  const [newMedDosage, setNewMedDosage] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Persist medications list
  useEffect(() => {
    localStorage.setItem(MEDS_KEY, JSON.stringify(medications))
  }, [medications])

  // Persist today's taken state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: new Date().toDateString(),
      taken,
    }))
  }, [taken])

  const toggleTaken = useCallback((medId) => {
    setTaken(prev => {
      const updated = { ...prev }
      if (updated[medId]) {
        delete updated[medId]
      } else {
        updated[medId] = new Date().toISOString()
      }
      return updated
    })
  }, [])

  const addMedication = () => {
    const name = newMedName.trim()
    if (!name) return
    const med = {
      id: Date.now().toString(36),
      name,
      dosage: newMedDosage.trim() || null,
    }
    setMedications(prev => [...prev, med])
    setNewMedName('')
    setNewMedDosage('')
    setShowAddForm(false)
  }

  const removeMedication = (medId) => {
    setMedications(prev => prev.filter(m => m.id !== medId))
    setTaken(prev => {
      const updated = { ...prev }
      delete updated[medId]
      return updated
    })
  }

  const takenCount = medications.filter(m => taken[m.id]).length
  const totalCount = medications.length

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="pill-tracker">
      <div className="pill-header">
        <h2>Medications</h2>
        {totalCount > 0 && (
          <span className="pill-progress">
            {takenCount}/{totalCount} taken
          </span>
        )}
      </div>

      {totalCount === 0 && !showAddForm ? (
        <p className="empty-state">No medications added yet</p>
      ) : (
        <ul className="med-list">
          {medications.map(med => (
            <li key={med.id} className={`med-item ${taken[med.id] ? 'taken' : ''}`}>
              <button
                className={`med-check ${taken[med.id] ? 'checked' : ''}`}
                onClick={() => toggleTaken(med.id)}
                aria-label={taken[med.id] ? `Mark ${med.name} as not taken` : `Mark ${med.name} as taken`}
              >
                {taken[med.id] ? '✓' : ''}
              </button>
              <div className="med-info">
                <span className="med-name">{med.name}</span>
                {med.dosage && <span className="med-dosage">{med.dosage}</span>}
                {taken[med.id] && (
                  <span className="med-time">Taken at {formatTime(taken[med.id])}</span>
                )}
              </div>
              <button
                className="btn-remove"
                onClick={() => removeMedication(med.id)}
                aria-label={`Remove ${med.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAddForm ? (
        <div className="add-med-form">
          <input
            type="text"
            placeholder="Medication name"
            value={newMedName}
            onChange={(e) => setNewMedName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMedication()}
            autoFocus
          />
          <input
            type="text"
            placeholder="Dosage (optional, e.g. 10mg)"
            value={newMedDosage}
            onChange={(e) => setNewMedDosage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMedication()}
          />
          <div className="add-med-actions">
            <button className="btn btn-primary btn-small" onClick={addMedication}>
              Add
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary btn-add-med" onClick={() => setShowAddForm(true)}>
          + Add Medication
        </button>
      )}
    </div>
  )
}
