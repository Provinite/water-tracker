import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const DAILY_GOAL = 2000
  const [waterIntake, setWaterIntake] = useState([])
  const [dailyGoal, setDailyGoal] = useState(DAILY_GOAL)

  useEffect(() => {
    const savedData = localStorage.getItem('waterTracker')
    if (savedData) {
      const parsed = JSON.parse(savedData)
      const today = new Date().toDateString()

      if (parsed.date === today) {
        setWaterIntake(parsed.intake || [])
        setDailyGoal(parsed.goal || DAILY_GOAL)
      } else {
        localStorage.setItem('waterTracker', JSON.stringify({
          date: today,
          intake: [],
          goal: parsed.goal || DAILY_GOAL
        }))
        setDailyGoal(parsed.goal || DAILY_GOAL)
      }
    }
  }, [])

  useEffect(() => {
    const today = new Date().toDateString()
    localStorage.setItem('waterTracker', JSON.stringify({
      date: today,
      intake: waterIntake,
      goal: dailyGoal
    }))
  }, [waterIntake, dailyGoal])

  const addWater = (amount) => {
    const entry = {
      amount,
      timestamp: new Date().toISOString()
    }
    setWaterIntake([...waterIntake, entry])
  }

  const removeEntry = (index) => {
    setWaterIntake(waterIntake.filter((_, i) => i !== index))
  }

  const totalIntake = waterIntake.reduce((sum, entry) => sum + entry.amount, 0)
  const progress = Math.min((totalIntake / dailyGoal) * 100, 100)

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
      </header>

      <div className="goal-section">
        <label htmlFor="goal">Daily Goal (ml):</label>
        <input
          id="goal"
          type="number"
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number(e.target.value))}
          min="0"
          step="100"
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
          {totalIntake} ml / {dailyGoal} ml ({Math.round(progress)}%)
        </p>
      </div>

      <div className="buttons">
        <button onClick={() => addWater(250)} className="btn btn-primary">
          +250ml
        </button>
        <button onClick={() => addWater(500)} className="btn btn-primary">
          +500ml
        </button>
        <button onClick={() => addWater(750)} className="btn btn-primary">
          +750ml
        </button>
        <button onClick={() => addWater(1000)} className="btn btn-primary">
          +1000ml
        </button>
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
                <span className="entry-amount">{entry.amount} ml</span>
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
