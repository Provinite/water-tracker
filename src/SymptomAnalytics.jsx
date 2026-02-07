import { useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from 'recharts'
import './SymptomAnalytics.css'

const COLORS = ['#ff9800', '#e91e63', '#00bcd4', '#8bc34a', '#9c27b0', '#ff5722']
const ONE_HOUR_MS = 60 * 60 * 1000
const YELLOW_THRESHOLD_ML = 500
const RED_THRESHOLD_ML = 946

function minutesSinceMidnight(timestamp) {
  const d = new Date(timestamp)
  return d.getHours() * 60 + d.getMinutes()
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hour12 = h % 12 || 12
  const ampm = h < 12 ? 'a' : 'p'
  return m === 0 ? `${hour12}${ampm}` : `${hour12}:${String(m).padStart(2, '0')}${ampm}`
}

export default function SymptomAnalytics({ symptomEntries, pillEntries, waterIntake, mlToUnit, currentUnit }) {
  const { chartData, symptomNames, pillEvents, waterDots } = useMemo(() => {
    const names = [...new Set((symptomEntries || []).map(e => e.name))]

    // Collect all unique timestamps from symptom entries
    const timeMap = new Map()
    for (const entry of (symptomEntries || [])) {
      const mins = minutesSinceMidnight(entry.timestamp)
      if (!timeMap.has(mins)) {
        timeMap.set(mins, { time: mins })
      }
      // For step charts, each point overwrites the previous value for that symptom at that time
      timeMap.get(mins)[entry.name] = entry.severity
    }

    // Sort by time and forward-fill previous symptom values for step display
    const sorted = [...timeMap.values()].sort((a, b) => a.time - b.time)
    const lastKnown = {}
    for (const point of sorted) {
      for (const name of names) {
        if (point[name] !== undefined) {
          lastKnown[name] = point[name]
        } else if (lastKnown[name] !== undefined) {
          point[name] = lastKnown[name]
        }
      }
    }

    // Pill events as vertical reference lines
    const pills = (pillEntries || []).map(entry => ({
      time: minutesSinceMidnight(entry.timestamp),
      label: entry.dosage ? `${entry.name} ${entry.dosage}` : entry.name,
    }))

    // Water events — compute per-entry risk level, keep only yellow/red
    const dots = []
    for (const entry of (waterIntake || [])) {
      const entryTime = new Date(entry.timestamp).getTime()
      const hourWindowMl = (waterIntake || [])
        .filter(e => {
          const t = new Date(e.timestamp).getTime()
          return t <= entryTime && t > entryTime - ONE_HOUR_MS
        })
        .reduce((sum, e) => sum + e.amount, 0)

      const riskLevel = hourWindowMl >= RED_THRESHOLD_ML ? 'red'
        : hourWindowMl >= YELLOW_THRESHOLD_ML ? 'green'
        : 'yellow'

      if (riskLevel === 'yellow') {
        dots.push({
          time: minutesSinceMidnight(entry.timestamp),
          y: 0,
          color: '#f59e0b',
          label: `${mlToUnit(entry.amount)} ${currentUnit.short} (low)`,
        })
      } else if (riskLevel === 'red') {
        dots.push({
          time: minutesSinceMidnight(entry.timestamp),
          y: 5,
          color: '#ef4444',
          label: `${mlToUnit(entry.amount)} ${currentUnit.short} (high)`,
        })
      }
    }

    return { chartData: sorted, symptomNames: names, pillEvents: pills, waterDots: dots }
  }, [symptomEntries, pillEntries, waterIntake, mlToUnit, currentUnit])

  if (!symptomEntries || symptomEntries.length === 0) {
    return (
      <div className="symptom-analytics-panel">
        <h2>Symptom Analytics</h2>
        <p className="symptom-analytics-empty">
          Log some symptoms to see how they change throughout the day.
        </p>
      </div>
    )
  }

  const tooltipStyle = {
    background: 'rgba(30,30,46,0.95)',
    border: '1px solid rgba(100,108,255,0.3)',
    borderRadius: 8,
    color: '#fff',
  }

  return (
    <div className="symptom-analytics-panel">
      <h2>Symptom Analytics</h2>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,136,136,0.2)" />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatMinutes}
            tick={{ fontSize: 12 }}
            stroke="#888"
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 12 }}
            stroke="#888"
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={formatMinutes}
            formatter={(value, name) => [`${value}/5`, name]}
          />
          <Legend />

          {symptomNames.map((name, i) => (
            <Line
              key={name}
              type="stepAfter"
              dataKey={name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls={false}
            />
          ))}

          {pillEvents.map((pill, i) => (
            <ReferenceLine
              key={`pill-${i}`}
              x={pill.time}
              stroke="#667eea"
              strokeDasharray="4 4"
              label={{ value: `💊 ${pill.label}`, position: 'top', fill: '#667eea', fontSize: 11 }}
            />
          ))}

          {waterDots.map((dot, i) => (
            <ReferenceDot
              key={`water-${i}`}
              x={dot.time}
              y={dot.y}
              r={5}
              fill={dot.color}
              stroke={dot.color}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
