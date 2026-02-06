import { useState, useEffect } from 'react'
import './SymptomTracker.css'

const LOG_KEY = 'symptomTracker'
const SYMPTOMS_KEY = 'symptomTrackerSymptoms'

function loadLog() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOG_KEY))
    if (saved && saved.date === new Date().toDateString()) {
      return Array.isArray(saved.entries) ? saved.entries : []
    }
  } catch { /* empty */ }
  return []
}

function loadSymptoms() {
  try {
    return JSON.parse(localStorage.getItem(SYMPTOMS_KEY)) || []
  } catch {
    return []
  }
}

export default function SymptomTracker({ onEntriesChange }) {
  const [symptoms, setSymptoms] = useState(loadSymptoms)
  const [entries, setEntries] = useState(loadLog)
  const [newSymptomName, setNewSymptomName] = useState('')
  const [showManage, setShowManage] = useState(false)
  const [activeSeverityId, setActiveSeverityId] = useState(null)

  useEffect(() => {
    localStorage.setItem(SYMPTOMS_KEY, JSON.stringify(symptoms))
  }, [symptoms])

  useEffect(() => {
    localStorage.setItem(LOG_KEY, JSON.stringify({
      date: new Date().toDateString(),
      entries,
    }))
    onEntriesChange?.(entries)
  }, [entries, onEntriesChange])

  const logSymptom = (symptom, severity) => {
    setEntries(prev => [...prev, {
      symptomId: symptom.id,
      name: symptom.name,
      severity,
      timestamp: new Date().toISOString(),
    }])
    setActiveSeverityId(null)
  }

  const removeEntry = (index) => {
    setEntries(prev => prev.filter((_, i) => i !== index))
  }

  const addSymptom = () => {
    const name = newSymptomName.trim()
    if (!name) return
    setSymptoms(prev => [...prev, {
      id: Date.now().toString(36),
      name,
    }])
    setNewSymptomName('')
  }

  const removeSymptom = (symptomId) => {
    setSymptoms(prev => prev.filter(s => s.id !== symptomId))
  }

  const handleSymptomClick = (symptomId) => {
    setActiveSeverityId(prev => prev === symptomId ? null : symptomId)
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="symptom-tracker">
      <div className="symptom-header">
        <h2>Symptoms</h2>
        <button
          onClick={() => setShowManage(!showManage)}
          className="btn-settings"
        >
          {showManage ? 'Done' : 'Manage'}
        </button>
      </div>

      {showManage && (
        <div className="symptom-manage">
          {symptoms.length > 0 && (
            <ul className="symptom-manage-list">
              {symptoms.map(symptom => (
                <li key={symptom.id}>
                  <span>{symptom.name}</span>
                  <button
                    className="btn-remove"
                    onClick={() => removeSymptom(symptom.id)}
                    aria-label={`Remove ${symptom.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="add-symptom-form">
            <input
              type="text"
              placeholder="Symptom name (e.g. Headache)"
              value={newSymptomName}
              onChange={(e) => setNewSymptomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
            />
            <button className="btn btn-secondary btn-small" onClick={addSymptom}>
              Add Symptom
            </button>
          </div>
        </div>
      )}

      {symptoms.length > 0 ? (
        <div className="symptom-buttons">
          {symptoms.map(symptom => (
            <div key={symptom.id} className="symptom-button-group">
              <button
                onClick={() => handleSymptomClick(symptom.id)}
                className={`btn btn-primary${activeSeverityId === symptom.id ? ' active' : ''}`}
              >
                {symptom.name}
              </button>
              {activeSeverityId === symptom.id && (
                <div className="severity-picker">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      className="severity-btn"
                      onClick={() => logSymptom(symptom, level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No symptoms configured — tap Manage to add some</p>
      )}

      <div className="symptom-log">
        <h3>Today's Log</h3>
        {entries.length === 0 ? (
          <p className="empty-state">No symptoms logged yet today</p>
        ) : (
          <ul>
            {[...entries].reverse().map((entry, index) => (
              <li key={entries.length - 1 - index}>
                <span className="entry-time">{formatTime(entry.timestamp)}</span>
                <span className="entry-amount">
                  {entry.name} — {entry.severity}/5
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
