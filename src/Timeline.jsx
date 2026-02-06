import { useMemo } from 'react'
import './Timeline.css'

export default function Timeline({ waterIntake, pillEntries, currentUnit, mlToUnit }) {
  const events = useMemo(() => {
    const ONE_HOUR_MS = 60 * 60 * 1000
    const YELLOW_THRESHOLD_ML = 500
    const RED_THRESHOLD_ML = 946

    const waterEvents = waterIntake.map(entry => {
      const entryTime = new Date(entry.timestamp).getTime()
      const hourWindowMl = waterIntake
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

    const pillEvents = pillEntries.map(entry => ({
      type: 'pill',
      timestamp: entry.timestamp,
      label: entry.dosage ? `${entry.name} ${entry.dosage}` : entry.name,
    }))

    return [...waterEvents, ...pillEvents].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )
  }, [waterIntake, pillEntries, currentUnit, mlToUnit])

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
      <h2 className="timeline-header">Today's Timeline</h2>
      {events.length === 0 ? (
        <p className="timeline-empty">No events logged yet today</p>
      ) : (
        <ul className="timeline-list">
          {events.map((event, index) => (
            <li key={`${event.type}-${event.timestamp}-${index}`} className={`timeline-item${event.riskLevel ? ` risk-${event.riskLevel}` : ''}`}>
              <span className={`timeline-dot ${event.type}`} />
              <span className="timeline-time">{formatTime(event.timestamp)}</span>
              <span className="timeline-icon">{event.type === 'water' ? '\u{1F4A7}' : '\u{1F48A}'}</span>
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
