import { useState, useEffect } from 'react'
import './PillTracker.css'

const LOG_KEY = 'pillTracker'
const MEDS_KEY = 'pillTrackerMeds'

function loadLog() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOG_KEY))
    if (saved && saved.date === new Date().toDateString()) {
      return saved.entries
    }
  } catch { /* empty */ }
  return []
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
  const [entries, setEntries] = useState(loadLog)
  const [newMedName, setNewMedName] = useState('')
  const [newMedDosage, setNewMedDosage] = useState('')
  const [showManage, setShowManage] = useState(false)

  useEffect(() => {
    localStorage.setItem(MEDS_KEY, JSON.stringify(medications))
  }, [medications])

  useEffect(() => {
    localStorage.setItem(LOG_KEY, JSON.stringify({
      date: new Date().toDateString(),
      entries,
    }))
  }, [entries])

  const logMed = (med) => {
    setEntries(prev => [...prev, {
      medId: med.id,
      name: med.name,
      dosage: med.dosage,
      timestamp: new Date().toISOString(),
    }])
  }

  const removeEntry = (index) => {
    setEntries(prev => prev.filter((_, i) => i !== index))
  }

  const addMedication = () => {
    const name = newMedName.trim()
    if (!name) return
    setMedications(prev => [...prev, {
      id: Date.now().toString(36),
      name,
      dosage: newMedDosage.trim() || null,
    }])
    setNewMedName('')
    setNewMedDosage('')
  }

  const removeMedication = (medId) => {
    setMedications(prev => prev.filter(m => m.id !== medId))
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const buttonLabel = (med) => {
    return med.dosage ? `${med.name} ${med.dosage}` : med.name
  }

  return (
    <div className="pill-tracker">
      <div className="pill-header">
        <h2>Medications</h2>
        <button
          onClick={() => setShowManage(!showManage)}
          className="btn-settings"
        >
          {showManage ? 'Done' : 'Manage'}
        </button>
      </div>

      {showManage && (
        <div className="med-manage">
          {medications.length > 0 && (
            <ul className="med-manage-list">
              {medications.map(med => (
                <li key={med.id}>
                  <span>{med.name}{med.dosage ? ` — ${med.dosage}` : ''}</span>
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
          <div className="add-med-form">
            <input
              type="text"
              placeholder="Medication name"
              value={newMedName}
              onChange={(e) => setNewMedName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMedication()}
            />
            <input
              type="text"
              placeholder="Dosage (optional, e.g. 10mg)"
              value={newMedDosage}
              onChange={(e) => setNewMedDosage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMedication()}
            />
            <button className="btn btn-secondary btn-small" onClick={addMedication}>
              Add Medication
            </button>
          </div>
        </div>
      )}

      {medications.length > 0 ? (
        <div className="pill-buttons">
          {medications.map(med => (
            <button
              key={med.id}
              onClick={() => logMed(med)}
              className="btn btn-primary"
            >
              {buttonLabel(med)}
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-state">No medications configured — tap Manage to add some</p>
      )}

      <div className="pill-log">
        <h3>Today's Log</h3>
        {entries.length === 0 ? (
          <p className="empty-state">No medications logged yet today</p>
        ) : (
          <ul>
            {[...entries].reverse().map((entry, index) => (
              <li key={entries.length - 1 - index}>
                <span className="entry-time">{formatTime(entry.timestamp)}</span>
                <span className="entry-amount">
                  {entry.name}{entry.dosage ? ` ${entry.dosage}` : ''}
                </span>
                <button
                  onClick={() => removeEntry(entries.length - 1 - index)}
                  className="btn-remove"
                  aria-label="Remove entry"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
