import { useState, useMemo } from 'react'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import './Analytics.css'

const HISTORY_KEY = 'waterTrackerHistory'

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch {
    return []
  }
}

export default function Analytics({ todayIntake, dailyGoalMl, mlToUnit, currentUnit }) {
  const [timeRange, setTimeRange] = useState('week')
  const history = useMemo(() => getHistory(), [])
  const unitShort = currentUnit.short

  // Build today's entry from live data
  const todayEntry = useMemo(() => {
    const totalMl = todayIntake.reduce((sum, e) => sum + e.amount, 0)
    return {
      date: new Date().toISOString().split('T')[0],
      totalMl,
      goalMl: dailyGoalMl,
      entryCount: todayIntake.length,
      entries: todayIntake.map(e => ({
        hour: new Date(e.timestamp).getHours(),
        ml: e.amount,
      })),
    }
  }, [todayIntake, dailyGoalMl])

  // Combine history + today for charts
  const allDays = useMemo(() => {
    const days = [...history.filter(h => h.date !== todayEntry.date), todayEntry]
    days.sort((a, b) => a.date.localeCompare(b.date))
    return days
  }, [history, todayEntry])

  // Stats calculations
  const stats = useMemo(() => {
    let currentStreak = 0
    let bestStreak = 0
    let streak = 0
    let goalMetDays = 0

    // Walk from newest to oldest for current streak, then compute best overall
    const sorted = [...allDays].sort((a, b) => b.date.localeCompare(a.date))
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].totalMl >= sorted[i].goalMl) {
        if (i === currentStreak) currentStreak++
        goalMetDays++
      }
    }

    // Best streak: walk chronologically
    const chronological = [...allDays]
    for (const day of chronological) {
      if (day.totalMl >= day.goalMl) {
        streak++
        bestStreak = Math.max(bestStreak, streak)
      } else {
        streak = 0
      }
    }

    const last7 = allDays.slice(-7)
    const avg7 = last7.length > 0
      ? last7.reduce((sum, d) => sum + d.totalMl, 0) / last7.length
      : 0

    const completionRate = allDays.length > 0
      ? Math.round((goalMetDays / allDays.length) * 100)
      : 0

    return { currentStreak, bestStreak, avg7, completionRate }
  }, [allDays])

  // Bar chart data
  const barData = useMemo(() => {
    const count = timeRange === 'week' ? 7 : 30
    const days = allDays.slice(-count)

    return days.map(d => {
      const dateObj = new Date(d.date + 'T00:00:00')
      const label = timeRange === 'week'
        ? dateObj.toLocaleDateString('en-US', { weekday: 'short' })
        : `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      return {
        label,
        amount: mlToUnit(d.totalMl),
        goalMet: d.totalMl >= d.goalMl,
      }
    })
  }, [allDays, timeRange, mlToUnit])

  // Hourly distribution for today
  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, ml: 0 }))
    for (const entry of todayEntry.entries) {
      buckets[entry.hour].ml += entry.ml
    }
    return buckets
      .filter(b => b.ml > 0 || (b.hour >= 6 && b.hour <= 22))
      .map(b => ({
        label: `${b.hour % 12 || 12}${b.hour < 12 ? 'a' : 'p'}`,
        amount: mlToUnit(b.ml),
      }))
  }, [todayEntry, mlToUnit])

  const goalLine = mlToUnit(dailyGoalMl)
  const hasHistory = allDays.length > 1 || todayEntry.totalMl > 0

  if (!hasHistory) {
    return (
      <div className="analytics-panel">
        <h2>Analytics</h2>
        <p className="analytics-empty">
          Start tracking your water intake to see analytics here!
          Data will build up over time as you use the app each day.
        </p>
      </div>
    )
  }

  return (
    <div className="analytics-panel">
      <h2>Analytics</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.currentStreak}</span>
          <span className="stat-label">Current Streak</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.bestStreak}</span>
          <span className="stat-label">Best Streak</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{mlToUnit(stats.avg7).toFixed(1)}</span>
          <span className="stat-label">7-Day Avg ({unitShort})</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.completionRate}%</span>
          <span className="stat-label">Goal Rate</span>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <h3>Daily Intake</h3>
          <div className="time-range-toggle">
            <button
              className={timeRange === 'week' ? 'active' : ''}
              onClick={() => setTimeRange('week')}
            >
              Week
            </button>
            <button
              className={timeRange === 'month' ? 'active' : ''}
              onClick={() => setTimeRange('month')}
            >
              Month
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,136,136,0.2)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#888" />
            <YAxis tick={{ fontSize: 12 }} stroke="#888" />
            <Tooltip
              contentStyle={{
                background: 'rgba(30,30,46,0.95)',
                border: '1px solid rgba(100,108,255,0.3)',
                borderRadius: 8,
                color: '#fff',
              }}
              formatter={(value) => [`${value} ${unitShort}`, 'Intake']}
            />
            <ReferenceLine y={goalLine} stroke="#764ba2" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#764ba2', fontSize: 11 }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.goalMet ? '#667eea' : 'rgba(100,108,255,0.3)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {todayEntry.entries.length > 0 && (
        <div className="chart-section">
          <h3>Today's Hourly Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#764ba2" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#764ba2" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,136,136,0.2)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#888" />
              <YAxis tick={{ fontSize: 12 }} stroke="#888" />
              <Tooltip
                contentStyle={{
                  background: 'rgba(30,30,46,0.95)',
                  border: '1px solid rgba(100,108,255,0.3)',
                  borderRadius: 8,
                  color: '#fff',
                }}
                formatter={(value) => [`${value} ${unitShort}`, 'Intake']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#764ba2"
                fill="url(#purpleGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
