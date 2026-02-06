import { useState, useEffect } from 'react'
import Analytics from './Analytics'
import './App.css'

const PRESET_UNITS = {
  ml: { name: 'Milliliters', short: 'ml', mlPerUnit: 1 },
  oz: { name: 'Fluid Ounces', short: 'oz', mlPerUnit: 29.5735 },
  cup: { name: 'Cups', short: 'cup', mlPerUnit: 236.588 },
  bottle: { name: 'Bottles (16.9 oz)', short: 'bottle', mlPerUnit: 500 },
}

function App() {
  const DAILY_GOAL_ML = 2000
  const [waterIntake, setWaterIntake] = useState([])
  const [dailyGoalMl, setDailyGoalMl] = useState(DAILY_GOAL_ML)
  const [unit, setUnit] = useState('ml')
  const [customUnits, setCustomUnits] = useState({})
  const [quickAddAmounts, setQuickAddAmounts] = useState([1, 2, 3, 4])
  const [showSettings, setShowSettings] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitMl, setNewUnitMl] = useState('')

  const allUnits = { ...PRESET_UNITS, ...customUnits }
  const currentUnit = allUnits[unit] || PRESET_UNITS.ml

  const mlToUnit = (ml) => {
    return Number((ml / currentUnit.mlPerUnit).toFixed(2))
  }

  const unitToMl = (amount) => {
    return amount * currentUnit.mlPerUnit
  }

  useEffect(() => {
    const savedData = localStorage.getItem('waterTracker')
    if (savedData) {
      const parsed = JSON.parse(savedData)
      const today = new Date().toDateString()

      if (parsed.date === today) {
        setWaterIntake(parsed.intake || [])
        setDailyGoalMl(parsed.goalMl || DAILY_GOAL_ML)
      } else {
        // Archive yesterday's data before clearing
        if (parsed.intake && parsed.intake.length > 0) {
          const historyKey = 'waterTrackerHistory'
          let history = []
          try { history = JSON.parse(localStorage.getItem(historyKey)) || [] } catch { /* empty */ }

          const yesterdayDate = new Date(parsed.date).toISOString().split('T')[0]
          if (!history.some(h => h.date === yesterdayDate)) {
            const totalMl = parsed.intake.reduce((sum, e) => sum + e.amount, 0)
            history.push({
              date: yesterdayDate,
              totalMl,
              goalMl: parsed.goalMl || DAILY_GOAL_ML,
              entryCount: parsed.intake.length,
              entries: parsed.intake.map(e => ({
                hour: new Date(e.timestamp).getHours(),
                ml: e.amount,
              })),
            })
            // Trim to 90 days max
            if (history.length > 90) history = history.slice(-90)
            localStorage.setItem(historyKey, JSON.stringify(history))
          }
        }

        localStorage.setItem('waterTracker', JSON.stringify({
          date: today,
          intake: [],
          goalMl: parsed.goalMl || DAILY_GOAL_ML,
          unit: parsed.unit || 'ml',
          customUnits: parsed.customUnits || {},
          quickAddAmounts: parsed.quickAddAmounts || [1, 2, 3, 4]
        }))
        setDailyGoalMl(parsed.goalMl || DAILY_GOAL_ML)
      }

      if (parsed.unit) setUnit(parsed.unit)
      if (parsed.customUnits) setCustomUnits(parsed.customUnits)
      if (parsed.quickAddAmounts) setQuickAddAmounts(parsed.quickAddAmounts)
    }
  }, [])

  useEffect(() => {
    const today = new Date().toDateString()
    localStorage.setItem('waterTracker', JSON.stringify({
      date: today,
      intake: waterIntake,
      goalMl: dailyGoalMl,
      unit,
      customUnits,
      quickAddAmounts
    }))
  }, [waterIntake, dailyGoalMl, unit, customUnits, quickAddAmounts])

  const addWater = (amountInUnits) => {
    const entry = {
      amount: unitToMl(amountInUnits),
      timestamp: new Date().toISOString()
    }
    setWaterIntake([...waterIntake, entry])
  }

  const removeEntry = (index) => {
    setWaterIntake(waterIntake.filter((_, i) => i !== index))
  }

  const addCustomUnit = () => {
    if (newUnitName && newUnitMl && !allUnits[newUnitName.toLowerCase()]) {
      const unitKey = newUnitName.toLowerCase().replace(/\s+/g, '_')
      setCustomUnits({
        ...customUnits,
        [unitKey]: {
          name: newUnitName,
          short: newUnitName,
          mlPerUnit: Number(newUnitMl)
        }
      })
      setNewUnitName('')
      setNewUnitMl('')
    }
  }

  const deleteCustomUnit = (unitKey) => {
    const newCustom = { ...customUnits }
    delete newCustom[unitKey]
    setCustomUnits(newCustom)
    if (unit === unitKey) {
      setUnit('ml')
    }
  }

  const totalIntakeMl = waterIntake.reduce((sum, entry) => sum + entry.amount, 0)
  const progress = Math.min((totalIntakeMl / dailyGoalMl) * 100, 100)

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="app">
      <header>
        <h1>Water Tracker</h1>
        <div className="header-buttons">
          <button onClick={() => setShowAnalytics(!showAnalytics)} className="btn-settings">
            {showAnalytics ? 'Close Analytics' : 'Analytics'}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="btn-settings">
            {showSettings ? 'Close Settings' : 'Settings'}
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="settings-panel">
          <h2>Settings</h2>

          <div className="setting-group">
            <label htmlFor="unit">Unit:</label>
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              {Object.entries(allUnits).map(([key, u]) => (
                <option key={key} value={key}>
                  {u.name} ({u.short})
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>Quick Add Amounts:</label>
            <div className="quick-add-config">
              {quickAddAmounts.map((amount, index) => (
                <input
                  key={index}
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const newAmounts = [...quickAddAmounts]
                    newAmounts[index] = Number(e.target.value)
                    setQuickAddAmounts(newAmounts)
                  }}
                  min="0"
                  step="0.1"
                />
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label>Custom Units:</label>
            <div className="custom-units-list">
              {Object.entries(customUnits).map(([key, u]) => (
                <div key={key} className="custom-unit-item">
                  <span>{u.name} ({u.mlPerUnit}ml)</span>
                  <button
                    onClick={() => deleteCustomUnit(key)}
                    className="btn-remove-small"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div className="add-custom-unit">
              <input
                type="text"
                placeholder="Unit name (e.g., My Bottle)"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
              />
              <input
                type="number"
                placeholder="ml per unit"
                value={newUnitMl}
                onChange={(e) => setNewUnitMl(e.target.value)}
                min="0"
              />
              <button onClick={addCustomUnit} className="btn btn-secondary">
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnalytics && (
        <Analytics
          todayIntake={waterIntake}
          dailyGoalMl={dailyGoalMl}
          mlToUnit={mlToUnit}
          currentUnit={currentUnit}
        />
      )}

      <div className="goal-section">
        <label htmlFor="goal">Daily Goal ({currentUnit.short}):</label>
        <input
          id="goal"
          type="number"
          value={mlToUnit(dailyGoalMl)}
          onChange={(e) => setDailyGoalMl(unitToMl(Number(e.target.value)))}
          min="0"
          step="0.1"
        />
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="progress-text">
          {mlToUnit(totalIntakeMl)} {currentUnit.short} / {mlToUnit(dailyGoalMl)} {currentUnit.short} ({Math.round(progress)}%)
        </p>
      </div>

      <div className="buttons">
        {quickAddAmounts.map((amount, index) => (
          <button
            key={index}
            onClick={() => addWater(amount)}
            className="btn btn-primary"
          >
            +{amount} {currentUnit.short}
          </button>
        ))}
      </div>

      <div className="history">
        <h2>Today's Log</h2>
        {waterIntake.length === 0 ? (
          <p className="empty-state">No water logged yet today</p>
        ) : (
          <ul>
            {[...waterIntake].reverse().map((entry, index) => (
              <li key={waterIntake.length - 1 - index}>
                <span className="entry-time">{formatTime(entry.timestamp)}</span>
                <span className="entry-amount">{mlToUnit(entry.amount)} {currentUnit.short}</span>
                <button
                  onClick={() => removeEntry(waterIntake.length - 1 - index)}
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

export default App
