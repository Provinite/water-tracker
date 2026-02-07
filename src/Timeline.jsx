import { useState, useMemo } from 'react'
import './Timeline.css'

const toISODate = (d) => d.toISOString().slice(0, 10)
const TODAY = toISODate(new Date())

function formatDateLabel(dateStr) {
  const today = toISODate(new Date())
  if (dateStr === today) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === toISODate(yesterday)) return 'Yesterday'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function loadHistoricalData(dateStr) {
  let water = []
  let pills = []
  let symptoms = []

  try {
    const wh = JSON.parse(localStorage.getItem('waterTrackerHistory') || '[]')
    const wEntry = wh.find(e => e.date === dateStr)
    if (wEntry && wEntry.entries) {
      water = wEntry.entries.map(e => ({
        amount: e.ml,
        timestamp: new Date(dateStr + 'T' + String(e.hour).padStart(2, '0') + ':00:00').toISOString(),
      }))
    }
  } catch {}

  try {
    const ph = JSON.parse(localStorage.getItem('pillTrackerHistory') || '[]')
    const pEntry = ph.find(e => e.date === dateStr)
    if (pEntry && pEntry.entries) {
      pills = pEntry.entries
    }
  } catch {}

  try {
    const sh = JSON.parse(localStorage.getItem('symptomTrackerHistory') || '[]')
    const sEntry = sh.find(e => e.date === dateStr)
    if (sEntry && sEntry.entries) {
      symptoms = sEntry.entries
    }
  } catch {}

  return { water, pills, symptoms }
}

export default function Timeline({ waterIntake, pillEntries, symptomEntries, currentUnit, mlToUnit }) {
  const [selectedDate, setSelectedDate] = useState(TODAY)

  const isToday = selectedDate === TODAY

  const { water, pills, symptoms } = useMemo(() => {
    if (isToday) {
      return { water: waterIntake, pills: pillEntries, symptoms: symptomEntries }
    }
    return loadHistoricalData(selectedDate)
  }, [selectedDate, isToday, waterIntake, pillEntries, symptomEntries])

  const goBack = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(toISODate(d))
  }

  const goForward = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    const next = toISODate(d)
    if (next <= TODAY) setSelectedDate(next)
  }

  const events = useMemo(() => {
    const ONE_HOUR_MS = 60 * 60 * 1000
    const YELLOW_THRESHOLD_ML = 500
    const RED_THRESHOLD_ML = 946

    const waterEvents = water.map(entry => {
      const entryTime = new Date(entry.timestamp).getTime()
      const hourWindowMl = water
        .filter(e => {
          const t = new Date(e.timestamp).getTime()
          return t <= entryTime && t > entryTime - ONE_HOUR_MS
        })
        .reduce((sum, e) => sum + e.amount, 0)

      const riskLevel = hourWindowMl >= RED_THRESHOLD_ML ? 'red'
        : hourWindowMl >= YELLOW_THRESHOLD_ML ? 'green'
        : 'yellow'

      const windowStart = new Date(entryTime - ONE_HOUR_MS)

      return {
        type: 'water',
        timestamp: entry.timestamp,
        label: `${mlToUnit(entry.amount)} ${currentUnit.short}`,
        riskLevel,
        hourWindowMl,
        windowStart,
      }
    })

    const pillEvents = pills.map(entry => ({
      type: 'pill',
      timestamp: entry.timestamp,
      label: entry.dosage ? `${entry.name} ${entry.dosage}` : entry.name,
    }))

    const symptomEvents = (symptoms || []).map(entry => ({
      type: 'symptom',
      timestamp: entry.timestamp,
      label: `${entry.name} — ${entry.severity}/5`,
    }))

    return [...waterEvents, ...pillEvents, ...symptomEvents].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )
  }, [water, pills, symptoms, currentUnit, mlToUnit])

  const waterTooltip = (event) => {
    const total = `${mlToUnit(event.hourWindowMl)} ${currentUnit.short}`
    const since = formatTime(event.windowStart)
    if (event.riskLevel === 'red') {
      return `That's a lot in a short window — ${total} since ${since}. Consider giving your body a break.`
    }
    if (event.riskLevel === 'yellow') {
      return `Only ${total} since ${since} — remember to keep sipping!`
    }
    return `Looking good — ${total} since ${since}. Nice and steady.`
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="timeline-sidebar">
      <div className="timeline-date-nav">
        <button className="timeline-nav-btn" onClick={goBack} aria-label="Previous day">&lsaquo;</button>
        <span className="timeline-date-label">{formatDateLabel(selectedDate)}</span>
        <button className="timeline-nav-btn" onClick={goForward} disabled={isToday} aria-label="Next day">&rsaquo;</button>
      </div>
      {events.length === 0 ? (
        <p className="timeline-empty">{isToday ? 'No events logged yet today' : 'No events recorded'}</p>
      ) : (
        <ul className="timeline-list">
          {events.map((event, index) => (
            <li key={`${event.type}-${event.timestamp}-${index}`} className={`timeline-item${event.riskLevel ? ` risk-${event.riskLevel}` : ''}`}>
              <span className={`timeline-dot ${event.type}`} />
              <span className="timeline-time">{formatTime(event.timestamp)}</span>
              <span className="timeline-icon">{event.type === 'water' ? '\u{1F4A7}' : event.type === 'symptom' ? '\u{1FA7A}' : '\u{1F48A}'}</span>
              <span className="timeline-label">{event.label}</span>
              {event.riskLevel && (
                <span className="timeline-tooltip">{waterTooltip(event)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
