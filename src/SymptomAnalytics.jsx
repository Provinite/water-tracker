import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from 'recharts'
import './SymptomAnalytics.css'

const COLORS = ['#ff9800', '#e91e63', '#00bcd4', '#8bc34a', '#9c27b0', '#ff5722']
const ONE_HOUR_MS = 60 * 60 * 1000
const YELLOW_THRESHOLD_ML = 500
const RED_THRESHOLD_ML = 946

const toISODate = (d) => d.toISOString().slice(0, 10)

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

function formatEpochTick(ms) {
  const d = new Date(ms)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const h = d.getHours()
  const hour12 = h % 12 || 12
  const ampm = h < 12 ? 'a' : 'p'
  return `${days[d.getDay()]} ${hour12}${ampm}`
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

export default function SymptomAnalytics({ symptomEntries, pillEntries, waterIntake, mlToUnit, currentUnit }) {
  const [hiddenSymptoms, setHiddenSymptoms] = useState(new Set())
  const [selectedRange, setSelectedRange] = useState('today')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), [])

  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  const isMultiDay = selectedRange === 'week'

  const { resolvedSymptoms, resolvedPills, resolvedWater } = useMemo(() => {
    if (selectedRange === 'today') {
      return {
        resolvedSymptoms: symptomEntries || [],
        resolvedPills: pillEntries || [],
        resolvedWater: waterIntake || [],
      }
    }

    if (selectedRange === 'yesterday') {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      const dateStr = toISODate(y)
      const { water, pills, symptoms } = loadHistoricalData(dateStr)
      return { resolvedSymptoms: symptoms, resolvedPills: pills, resolvedWater: water }
    }

    // 'week' — last 7 days of history + today
    const allSymptoms = [...(symptomEntries || [])]
    const allPills = [...(pillEntries || [])]
    const allWater = [...(waterIntake || [])]

    for (let i = 1; i <= 6; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = toISODate(d)
      const { water, pills, symptoms } = loadHistoricalData(dateStr)
      allSymptoms.push(...symptoms)
      allPills.push(...pills)
      allWater.push(...water)
    }

    return { resolvedSymptoms: allSymptoms, resolvedPills: allPills, resolvedWater: allWater }
  }, [selectedRange, symptomEntries, pillEntries, waterIntake])

  const { chartData, symptomNames, pillEvents, waterDots } = useMemo(() => {
    const names = [...new Set((resolvedSymptoms || []).map(e => e.name))]

    const timeMap = new Map()
    for (const entry of (resolvedSymptoms || [])) {
      const timeKey = isMultiDay
        ? new Date(entry.timestamp).getTime()
        : minutesSinceMidnight(entry.timestamp)
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { time: timeKey })
      }
      timeMap.get(timeKey)[entry.name] = entry.severity
    }

    const sorted = [...timeMap.values()].sort((a, b) => a.time - b.time)

    // Add projection data only for 'today'
    if (selectedRange === 'today') {
      const nowMins = minutesSinceMidnight(new Date().toISOString())
      const lastDataTime = sorted.length > 0 ? sorted[sorted.length - 1].time : -1

      for (const name of names) {
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (sorted[i][name] != null) {
            sorted[i][`${name}_proj`] = sorted[i][name]
            break
          }
        }
      }

      if (nowMins > lastDataTime) {
        const nowPoint = { time: nowMins }
        for (const name of names) {
          for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i][name] != null) {
              nowPoint[`${name}_proj`] = sorted[i][name]
              break
            }
          }
        }
        sorted.push(nowPoint)
      }
    }

    // Pill events
    const pills = (resolvedPills || []).map(entry => ({
      time: isMultiDay
        ? new Date(entry.timestamp).getTime()
        : minutesSinceMidnight(entry.timestamp),
      label: entry.dosage ? `${entry.name} ${entry.dosage}` : entry.name,
    }))

    // Water risk dots
    const dots = []
    for (const entry of (resolvedWater || [])) {
      const entryTime = new Date(entry.timestamp).getTime()
      const hourWindowMl = (resolvedWater || [])
        .filter(e => {
          const t = new Date(e.timestamp).getTime()
          return t <= entryTime && t > entryTime - ONE_HOUR_MS
        })
        .reduce((sum, e) => sum + e.amount, 0)

      const riskLevel = hourWindowMl >= RED_THRESHOLD_ML ? 'red'
        : hourWindowMl >= YELLOW_THRESHOLD_ML ? 'green'
        : 'yellow'

      const dotTime = isMultiDay
        ? new Date(entry.timestamp).getTime()
        : minutesSinceMidnight(entry.timestamp)

      if (riskLevel === 'yellow') {
        dots.push({
          time: dotTime,
          y: 0,
          color: '#f59e0b',
          label: `${mlToUnit(entry.amount)} ${currentUnit.short} (low)`,
        })
      } else if (riskLevel === 'red') {
        dots.push({
          time: dotTime,
          y: 5,
          color: '#ef4444',
          label: `${mlToUnit(entry.amount)} ${currentUnit.short} (high)`,
        })
      }
    }

    return { chartData: sorted, symptomNames: names, pillEvents: pills, waterDots: dots }
  }, [resolvedSymptoms, resolvedPills, resolvedWater, isMultiDay, selectedRange, mlToUnit, currentUnit])

  const toggleSymptom = (name) => {
    setHiddenSymptoms(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const hasData = resolvedSymptoms && resolvedSymptoms.length > 0

  const panelClass = `symptom-analytics-panel${isFullscreen ? ' fullscreen' : ''}`

  const heading = (
    <div className="symptom-analytics-header">
      <h2>Symptom Analytics</h2>
      <button className="symptom-fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        {isFullscreen ? '\u2716' : '\u26F6'}
      </button>
    </div>
  )

  const rangeToggle = (
    <div className="symptom-range-toggle">
      {['today', 'yesterday', 'week'].map(range => (
        <button
          key={range}
          className={selectedRange === range ? 'active' : ''}
          onClick={() => setSelectedRange(range)}
        >
          {range === 'today' ? 'Today' : range === 'yesterday' ? 'Yesterday' : 'This Week'}
        </button>
      ))}
    </div>
  )

  if (!hasData && selectedRange === 'today') {
    return (
      <div className={panelClass}>
        {heading}
        {rangeToggle}
        <p className="symptom-analytics-empty">
          Log some symptoms to see how they change throughout the day.
        </p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className={panelClass}>
        {heading}
        {rangeToggle}
        <p className="symptom-analytics-empty">
          No symptom data for this range.
        </p>
      </div>
    )
  }

  const visibleNames = symptomNames.filter(n => !hiddenSymptoms.has(n))

  const tooltipStyle = {
    background: 'rgba(30,30,46,0.95)',
    border: '1px solid rgba(100,108,255,0.3)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#fff',
    fontSize: 13,
  }

  const tooltipFormatter = isMultiDay ? formatEpochTick : formatMinutes

  return (
    <div className={panelClass}>
      {heading}
      {rangeToggle}

      <div className="symptom-legend">
        {symptomNames.map((name, i) => {
          const color = COLORS[i % COLORS.length]
          const hidden = hiddenSymptoms.has(name)
          return (
            <button
              key={name}
              className={`symptom-legend-chip${hidden ? ' hidden' : ''}`}
              style={{ '--chip-color': color }}
              onClick={() => toggleSymptom(name)}
            >
              <span className="symptom-legend-swatch" />
              {name}
            </button>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={isFullscreen ? '100%' : 420}>
        <ComposedChart data={chartData} margin={{ top: 30, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,136,136,0.2)" />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={isMultiDay ? formatEpochTick : formatMinutes}
            tick={{ fontSize: 13 }}
            stroke="#888"
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 13 }}
            stroke="#888"
            width={30}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload) return null
              const items = payload.filter(p => !p.dataKey.endsWith('_proj') && p.value != null)
              if (items.length === 0) return null
              return (
                <div style={tooltipStyle} className="recharts-default-tooltip" >
                  <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{tooltipFormatter(label)}</p>
                  {items.map(item => (
                    <p key={item.dataKey} style={{ margin: 0, color: item.stroke }}>
                      {item.dataKey}: {item.value}/5
                    </p>
                  ))}
                </div>
              )
            }}
          />

          {visibleNames.map((name) => {
            const i = symptomNames.indexOf(name)
            const color = COLORS[i % COLORS.length]
            return [
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 5, strokeWidth: 2 }}
                activeDot={{ r: 7 }}
                connectNulls
              />,
              selectedRange === 'today' && (
                <Line
                  key={`${name}_proj`}
                  type="monotone"
                  dataKey={`${name}_proj`}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  legendType="none"
                />
              ),
            ]
          })}

          {pillEvents.map((pill, i) => (
            <ReferenceLine
              key={`pill-${i}`}
              x={pill.time}
              stroke="#667eea"
              strokeDasharray="4 4"
              label={{ value: `💊 ${pill.label}`, position: 'top', fill: '#667eea', fontSize: 12 }}
            />
          ))}

          {waterDots.map((dot, i) => (
            <ReferenceDot
              key={`water-${i}`}
              x={dot.time}
              y={dot.y}
              r={6}
              fill={dot.color}
              stroke={dot.color}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
