import { useMemo } from 'react'
import './Timeline.css'

export default function Timeline({ waterIntake, pillEntries, currentUnit, mlToUnit }) {
  const events = useMemo(() => {
    const waterEvents = waterIntake.map(entry => ({
      type: 'water',
      timestamp: entry.timestamp,
      label: `${mlToUnit(entry.amount)} ${currentUnit.short}`,
    }))

    const pillEvents = pillEntries.map(entry => ({
      type: 'pill',
      timestamp: entry.timestamp,
      label: entry.dosage ? `${entry.name} ${entry.dosage}` : entry.name,
    }))

    return [...waterEvents, ...pillEvents].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )
  }, [waterIntake, pillEntries, currentUnit, mlToUnit])

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
            <li key={`${event.type}-${event.timestamp}-${index}`} className="timeline-item">
              <span className={`timeline-dot ${event.type}`} />
              <span className="timeline-time">{formatTime(event.timestamp)}</span>
              <span className="timeline-icon">{event.type === 'water' ? '\u{1F4A7}' : '\u{1F48A}'}</span>
              <span className="timeline-label">{event.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
