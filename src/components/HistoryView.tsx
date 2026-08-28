import { useMemo, useState } from 'react'
import type { HistoryDay, Routine, Task } from '../lib/model'
import { dateRangeEnding, formatPrettyDate, formatShortWeekday } from '../lib/date'
import { percent } from '../lib/model'

type Props = { history: HistoryDay[]; routines: Routine[]; tasks: Task[]; today: string; onToday: () => void }

export default function HistoryView({ history, routines, tasks, today, onToday }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const historyMap = useMemo(() => new Map(history.map((item) => [item.date, item])), [history])
  const currentDay: HistoryDay = {
    date: today,
    completed: tasks.filter((task) => task.completed).length,
    total: tasks.length,
    routinesCompleted: tasks.filter((task) => task.routineId && task.completed).length,
    routinesTotal: tasks.filter((task) => task.routineId).length,
  }
  const week = dateRangeEnding(today, 7).map((date) => date === today ? currentDay : historyMap.get(date) || {
    date, completed: 0, total: 0, routinesCompleted: 0, routinesTotal: 0,
  })
  const recorded = history.length
  const avg = recorded ? Math.round(history.reduce((sum, item) => sum + percent(item.completed, item.total), 0) / recorded) : 0
  const selected = selectedDate ? (selectedDate === today ? currentDay : historyMap.get(selectedDate)) : null
  const activeRoutines = routines.filter((routine) => routine.active)
  const weekKeys = dateRangeEnding(today, 7)
  const routineStats = activeRoutines.map((routine) => {
    const recent = weekKeys.filter((date) => routine.completedDates.includes(date)).length
    return { routine, completions: routine.completedDates.length, recent, recentPct: Math.round(recent / 7 * 100) }
  }).sort((a, b) => b.recentPct - a.recentPct)
  const weekTotal = week.reduce((sum, day) => sum + day.total, 0)
  const weekDone = week.reduce((sum, day) => sum + day.completed, 0)
  const weekPct = percent(weekDone, weekTotal)
  const consistentDays = week.filter((day) => day.total > 0 && percent(day.completed, day.total) >= 70).length

  return (
    <section className="page-view history-page">
      <div className="page-heading">
        <div>
          <div className="micro">LOOKING BACK</div>
          <h1>Your <i>history.</i></h1>
          <p>See the patterns behind your consistency — without turning your life into a spreadsheet.</p>
        </div>
        <button type="button" className="primary" onClick={onToday}>Back to today ↗</button>
      </div>

      <div className="history-insights-grid">
        <div className="history-week-card">
          <div className="history-card-head">
            <div><span className="micro">LAST 7 DAYS</span><h2>{weekPct}% <small>completion</small></h2></div>
            <div className="consistency-chip">{consistentDays}/7 consistent</div>
          </div>
          <div className="week-chart">
            {week.map((day) => {
              const value = percent(day.completed, day.total)
              const isToday = day.date === today
              return (
                <button
                  type="button"
                  className={`week-day ${isToday ? 'is-today' : ''} ${selectedDate === day.date ? 'is-selected' : ''}`}
                  key={day.date}
                  onClick={() => setSelectedDate(selectedDate === day.date ? null : day.date)}
                  aria-label={`View ${formatPrettyDate(day.date)}`}
                  aria-pressed={selectedDate === day.date}
                >
                  <div className="week-bar-track"><span style={{ height: `${day.total ? Math.max(7, value) : 5}%` }} /></div>
                  <b>{value}%</b>
                  <small>{formatShortWeekday(day.date)}</small>
                </button>
              )
            })}
          </div>
          <p className="chart-note">Tap a day to inspect what happened.</p>
        </div>
        <div className="history-summary-card">
          <span className="micro">YOUR RHYTHM</span>
          <div className="summary-number">{avg}%</div>
          <p>average completion across {recorded || 0} recorded day{recorded === 1 ? '' : 's'}</p>
          <div className="summary-line"><span>Days recorded</span><strong>{recorded}</strong></div>
          <div className="summary-line"><span>Active routines</span><strong>{activeRoutines.length}</strong></div>
        </div>
      </div>

      {selected && (
        <div className="history-day-detail">
          <div><span className="micro">DAY DETAIL</span><h2>{formatPrettyDate(selected.date)}</h2></div>
          <div className="detail-metrics">
            <div><strong>{percent(selected.completed, selected.total)}%</strong><span>overall</span></div>
            <div><strong>{selected.completed}/{selected.total}</strong><span>tasks</span></div>
            <div><strong>{selected.routinesCompleted}/{selected.routinesTotal}</strong><span>routines</span></div>
          </div>
        </div>
      )}

      <div className="history-section-heading">
        <div><span className="micro">ROUTINE PERFORMANCE</span><h2>What is <i>sticking.</i></h2></div>
        <span>{activeRoutines.length} active</span>
      </div>
      {activeRoutines.length ? (
        <div className="routine-performance-list">
          {routineStats.map(({ routine, completions, recent, recentPct }) => (
            <div className="routine-performance" key={routine.id}>
              <div className="performance-icon">↗</div>
              <div className="performance-info">
                <div><b>{routine.title}</b><span>{routine.frequency.toLowerCase()} · {recent}/7 this week</span></div>
                <div className="performance-track"><span style={{ width: `${recentPct}%` }} /></div>
              </div>
              <div className="performance-numbers">
                <strong>{routine.currentStreak}</strong>
                <span>day streak</span>
                <small>{completions} total</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="big-empty compact">
          <div>◌</div>
          <h2>No routine patterns yet.</h2>
          <p>Create a routine and its consistency will start appearing here.</p>
        </div>
      )}

      <div className="history-section-heading older-heading">
        <div><span className="micro">DAY BY DAY</span><h2>The <i>record.</i></h2></div>
      </div>
      <div className="history-list history-list-wide">
        {!history.length ? (
          <div className="big-empty compact">
            <div>◌</div>
            <h2>Your story starts today.</h2>
            <p>When a day closes, its record will appear here.</p>
            <button type="button" className="primary" onClick={onToday}>Back to today</button>
          </div>
        ) : [...history].reverse().map((item) => (
          <button
            type="button"
            className={`history-row history-row-button ${selectedDate === item.date ? 'selected' : ''}`}
            key={item.date}
            onClick={() => setSelectedDate(selectedDate === item.date ? null : item.date)}
          >
            <div>
              <b>{formatPrettyDate(item.date)}</b>
              <span>{item.completed} of {item.total} completed · {item.routinesCompleted} of {item.routinesTotal} routines</span>
            </div>
            <div className="history-row-score">
              <strong>{percent(item.completed, item.total)}%</strong>
              <span>{percent(item.completed, item.total) >= 70 ? 'consistent' : 'room to improve'}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
