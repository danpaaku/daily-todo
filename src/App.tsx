import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './styles.css'
import Navigation from './components/Navigation'
import TimeSection from './components/TimeSection'
import RoutineView from './components/RoutineView'
import HistoryView from './components/HistoryView'
import SettingsView from './components/SettingsView'
import Onboarding from './components/Onboarding'
import DailyReset from './components/DailyReset'
import type { Filter, Frequency, HistoryDay, Routine, Section, Task, View } from './lib/model'
import { SECTIONS, blankData, defaultSettings } from './lib/model'
import { businessDayKey, formatLongDate } from './lib/date'
import { nowIso, uid } from './lib/ids'
import { describePreview, parseBackup, serializeBackup } from './lib/backup'
import { clearAllData, loadData, saveData } from './lib/storage'
import {
  addRoutine,
  completeTask,
  ensureBusinessDay,
  generateRoutineTasks,
  removeRoutine,
  setRoutineActive,
  skipRoutineOccurrence,
  snapshotDay,
  syncRoutineOccurrence,
  tasksForDate,
  upsertHistory,
} from './lib/reset'
import { routineDueOn } from './lib/routines'

function sectionForHour(hour: number): { greeting: string; active: Section; label: string } {
  if (hour >= 5 && hour < 12) return { greeting: 'Good morning', active: 'Morning', label: 'Morning is underway' }
  if (hour >= 12 && hour < 18) return { greeting: 'Good afternoon', active: 'Afternoon', label: 'Afternoon is underway' }
  return { greeting: 'Good evening', active: 'Evening', label: 'Evening is underway' }
}

export default function App() {
  const [session] = useState(() => ensureBusinessDay(loadData()))
  const [data, setData] = useState(session.data)
  const [view, setView] = useState<View>('today')
  const [title, setTitle] = useState('')
  const [section, setSection] = useState<Section>(session.data.settings.defaultSection)
  const [recurring, setRecurring] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>('Daily')
  const [routineTitle, setRoutineTitle] = useState('')
  const [routineSection, setRoutineSection] = useState<Section>(session.data.settings.defaultSection)
  const [routineFrequency, setRoutineFrequency] = useState<Frequency>('Daily')
  const [filter, setFilter] = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [routineOpen, setRoutineOpen] = useState(false)
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null)
  const [toast, setToast] = useState(session.carried.length ? `${session.carried.length} unfinished task${session.carried.length === 1 ? '' : 's'} carried into today` : '')
  const [resetNotice, setResetNotice] = useState<{ history: HistoryDay; carried: Task[] } | null>(
    session.closedDays.length ? { history: session.closedDays[session.closedDays.length - 1], carried: session.carried } : null,
  )
  const dataRef = useRef(data)
  dataRef.current = data
  const settings = data.settings
  const today = data.currentDate

  useEffect(() => { saveData(data) }, [data])
  useEffect(() => { document.documentElement.dataset.theme = settings.theme }, [settings.theme])
  useEffect(() => { setSection(settings.defaultSection) }, [settings.defaultSection])
  useEffect(() => {
    const applyReset = () => {
      const reset = ensureBusinessDay(dataRef.current)
      if (!reset.changed) return
      setData(reset.data)
      if (reset.closedDays.length) {
        setResetNotice({ history: reset.closedDays[reset.closedDays.length - 1], carried: reset.carried })
        setView('today')
      }
      if (reset.carried.length) {
        setToast(`${reset.carried.length} unfinished task${reset.carried.length === 1 ? '' : 's'} carried into today`)
      }
    }
    const timer = window.setInterval(applyReset, 30_000)
    window.addEventListener('focus', applyReset)
    document.addEventListener('visibilitychange', applyReset)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', applyReset)
      document.removeEventListener('visibilitychange', applyReset)
    }
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const persist = (next: typeof data) => setData(next)
  const update = (recipe: (current: typeof data) => typeof data) => setData(recipe)
  const notify = (message: string) => setToast(message)

  const updateSettings = (next: Partial<typeof settings>) => {
    setData((current) => {
      const settingsNext = { ...current.settings, ...next }
      const merged = { ...current, settings: settingsNext }
      if (next.dayStart && next.dayStart !== current.settings.dayStart) {
        return ensureBusinessDay(merged).data
      }
      return merged
    })
  }

  const exportBackup = () => {
    const blob = new Blob([serializeBackup(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `daily-backup-${today}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('Backup exported')
  }

  const importBackup = async (file: File) => {
    try {
      const parsed = parseBackup(await file.text(), businessDayKey(new Date(), settings.dayStart))
      if (!parsed.ok) {
        notify(parsed.error)
        return
      }
      if (!window.confirm(describePreview(parsed.preview))) return
      const restored = {
        ...parsed.data,
        settings: { ...parsed.data.settings, onboardingComplete: true },
      }
      const reset = ensureBusinessDay(restored)
      persist(reset.data)
      setResetNotice(reset.closedDays.length ? { history: reset.closedDays[reset.closedDays.length - 1], carried: reset.carried } : null)
      notify('Backup imported')
    } catch {
      notify('That backup could not be imported')
    }
  }

  const resetAllData = () => {
    if (!window.confirm('Reset all Daily data? This cannot be undone unless you have an export.')) return
    clearAllData()
    const fresh = blankData(businessDayKey(new Date(), defaultSettings().dayStart))
    persist(fresh)
    setView('today')
    setResetNotice(null)
    notify('Daily has been reset')
  }

  const tasks = tasksForDate(data.tasks, today)
  const done = tasks.filter((task) => task.completed).length
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0
  const hour = new Date().getHours()
  const timeContext = useMemo(() => sectionForHour(hour), [hour])
  const filtered = (bucket: Section) => tasks.filter((task) => task.section === bucket && (filter === 'all' || (filter === 'open' && !task.completed) || (filter === 'done' && task.completed)))

  const dismissCarryOvers = () => {
    if (!resetNotice) return
    const carriedIds = new Set(resetNotice.carried.map((task) => task.id))
    update((current) => ({ ...current, tasks: current.tasks.filter((task) => !carriedIds.has(task.id)) }))
    setResetNotice(null)
    notify('Unfinished tasks dismissed')
  }

  const addTask = (forceRoutine = recurring) => {
    const clean = title.trim()
    if (!clean) return
    const placed = section
    const cadence = frequency
    if (forceRoutine) {
      const routine: Routine = {
        id: uid(),
        title: clean,
        section: placed,
        frequency: cadence,
        active: true,
        currentStreak: 0,
        bestStreak: 0,
        completedDates: [],
        skippedDates: [],
        createdAt: nowIso(),
      }
      update((current) => addRoutine(current, routine, current.currentDate))
      notify('Routine created')
    } else {
      update((current) => ({
        ...current,
        tasks: [...current.tasks, {
          id: uid(),
          title: clean,
          section: placed,
          completed: false,
          createdAt: nowIso(),
          dueDate: current.currentDate,
        }],
      }))
      notify('Added to your day')
    }
    setTitle('')
    setRecurring(false)
    setFrequency('Daily')
  }

  const toggle = (id: string) => update((current) => completeTask(current, id, current.currentDate))

  const remove = (id: string) => {
    let message = 'Task removed'
    update((current) => {
      const target = tasksForDate(current.tasks, current.currentDate).find((task) => task.id === id)
      if (!target) return current
      if (target.routineId) {
        message = 'Routine hidden for today'
        return skipRoutineOccurrence(current, target.routineId, current.currentDate)
      }
      return { ...current, tasks: current.tasks.filter((task) => task.id !== id) }
    })
    notify(message)
  }

  const saveEdit = () => {
    if (!editingId) return
    const clean = editText.trim()
    const id = editingId
    if (clean) update((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, title: clean } : task) }))
    setEditingId(null)
    setEditText('')
  }
  const cancelEdit = () => { setEditingId(null); setEditText('') }
  const startEdit = (task: Task) => { setEditingId(task.id); setEditText(task.title) }

  const openNewRoutine = () => {
    setEditingRoutineId(null)
    setRoutineTitle('')
    setRoutineSection(settings.defaultSection)
    setRoutineFrequency('Daily')
    setRoutineOpen(true)
  }
  const openEditRoutine = (routine: Routine) => {
    setEditingRoutineId(routine.id)
    setRoutineTitle(routine.title)
    setRoutineSection(routine.section)
    setRoutineFrequency(routine.frequency)
    setRoutineOpen(true)
  }
  const createRoutineFromView = () => {
    const clean = routineTitle.trim()
    if (!clean) return
    if (editingRoutineId) {
      const id = editingRoutineId
      const placed = routineSection
      const cadence = routineFrequency
      update((current) => {
        const existing = current.routines.find((routine) => routine.id === id)
        if (!existing) return current
        const updated = { ...existing, title: clean, section: placed, frequency: cadence }
        let next = syncRoutineOccurrence(current, updated, current.currentDate)
        if (!routineDueOn(updated, current.currentDate)) next = skipRoutineOccurrence(next, updated.id, current.currentDate)
        else next = generateRoutineTasks(next, current.currentDate)
        return next
      })
      notify('Routine updated')
    } else {
      const placed = routineSection
      const cadence = routineFrequency
      const routine: Routine = {
        id: uid(),
        title: clean,
        section: placed,
        frequency: cadence,
        active: true,
        currentStreak: 0,
        bestStreak: 0,
        completedDates: [],
        skippedDates: [],
        createdAt: nowIso(),
      }
      update((current) => addRoutine(current, routine, current.currentDate))
      notify('Routine created')
    }
    setRoutineOpen(false)
    setEditingRoutineId(null)
    setRoutineTitle('')
  }

  const saveDay = () => {
    update((current) => ({ ...current, history: upsertHistory(current.history, snapshotDay(current, current.currentDate)) }))
    notify('Today saved to history')
  }

  const scoreStyle = { '--p': `${percent}%` } as CSSProperties

  return (
    <div className="shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div className="brand"><div className="brand-mark" aria-hidden="true">✦</div><span>daily</span></div>
        <Navigation view={view} routineCount={data.routines.length} onChange={setView} />
        <div className="topbar-actions">
          <div className="date-chip"><span className="pulse" />{formatLongDate(today)}</div>
          <button className="settings-trigger" aria-label="Open settings" aria-pressed={view === 'settings'} onClick={() => setView('settings')}>⚙</button>
        </div>
      </header>
      <main>
        {!settings.onboardingComplete && <Onboarding settings={settings} onComplete={updateSettings} />}
        {view === 'today' && resetNotice && (
          <DailyReset
            history={resetNotice.history}
            carriedCount={resetNotice.carried.length}
            onKeep={() => setResetNotice(null)}
            onDismiss={dismissCarryOvers}
          />
        )}
        {view === 'today' && (
          <>
            <section className="hero">
              <div>
                <div className="micro">{timeContext.greeting.toUpperCase()} · {formatLongDate(today).toUpperCase()}</div>
                <h1>Make today<br /><i>count.</i></h1>
                <p>Small actions. Clear mind. A day you can be proud of.</p>
              </div>
              <div className="score-card">
                <div className="score-ring" style={scoreStyle}><strong>{percent}<small>%</small></strong></div>
                <div>
                  <span>DAY SCORE</span>
                  <b>{done} <small>of {tasks.length}</small></b>
                  <p>{percent === 100 ? 'Everything done.' : percent === 0 ? 'Ready when you are.' : 'Keep the momentum.'}</p>
                </div>
              </div>
            </section>
            <section className="day-status">
              <div><span className="status-dot" /><b>{timeContext.label}</b><span className="status-copy">Follow the day, one thing at a time.</span></div>
              <div className="status-progress"><span style={{ width: `${percent}%` }} /></div>
            </section>
            <section className="composer">
              <div className="composer-main">
                <span className="plus" aria-hidden="true">+</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && addTask()}
                  placeholder="What would make today a good day?"
                  aria-label="New task title"
                />
                <button type="button" onClick={() => addTask()}>Add task <span>↵</span></button>
              </div>
              <div className="composer-options">
                <label>PLACE IT IN
                  <select value={section} onChange={(event) => setSection(event.target.value as Section)}>
                    {SECTIONS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="check-label">
                  <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
                  <span>Repeat</span>
                </label>
                {recurring && (
                  <label>FREQUENCY
                    <select value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)}>
                      <option>Daily</option>
                      <option>Weekdays</option>
                      <option>Weekly</option>
                    </select>
                  </label>
                )}
              </div>
            </section>
            <div className="view-tools">
              <div className="filters" role="tablist" aria-label="Task filters">
                <button type="button" className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All <span>{tasks.length}</span></button>
                <button type="button" className={filter === 'open' ? 'selected' : ''} onClick={() => setFilter('open')}>Open <span>{tasks.length - done}</span></button>
                <button type="button" className={filter === 'done' ? 'selected' : ''} onClick={() => setFilter('done')}>Done <span>{done}</span></button>
              </div>
              <button type="button" className="quiet-action" onClick={saveDay}>Save today to history ↗</button>
            </div>
            <div className="sections-grid">
              {SECTIONS.map((bucket) => (
                <TimeSection
                  key={bucket}
                  section={bucket}
                  tasks={filtered(bucket)}
                  editingId={editingId}
                  editText={editText}
                  active={timeContext.active === bucket}
                  onToggle={toggle}
                  onStartEdit={startEdit}
                  onDelete={remove}
                  onEditTextChange={setEditText}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                />
              ))}
            </div>
          </>
        )}
        {view === 'settings' && (
          <SettingsView settings={settings} onChange={updateSettings} onExport={exportBackup} onImport={importBackup} onReset={resetAllData} />
        )}
        {view === 'routines' && (
          <RoutineView
            routines={data.routines}
            today={today}
            editingId={editingRoutineId}
            open={routineOpen}
            title={routineTitle}
            section={routineSection}
            frequency={routineFrequency}
            onOpen={openNewRoutine}
            onClose={() => { setRoutineOpen(false); setEditingRoutineId(null); setRoutineTitle('') }}
            onTitle={setRoutineTitle}
            onSection={setRoutineSection}
            onFrequency={setRoutineFrequency}
            onCreate={createRoutineFromView}
            onToggle={(id) => {
              update((current) => {
                const occurrence = tasksForDate(current.tasks, current.currentDate).find((task) => task.routineId === id)
                return occurrence ? completeTask(current, occurrence.id, current.currentDate) : current
              })
            }}
            onToggleActive={(id) => {
              update((current) => {
                const existing = current.routines.find((routine) => routine.id === id)
                if (!existing) return current
                return setRoutineActive(current, id, !existing.active, current.currentDate)
              })
              notify('Routine updated')
            }}
            onEdit={openEditRoutine}
            onDelete={(id) => { update((current) => removeRoutine(current, id)); notify('Routine removed') }}
          />
        )}
        {view === 'history' && (
          <HistoryView history={data.history} routines={data.routines} tasks={tasks} today={today} onToday={() => setView('today')} />
        )}
      </main>
      {toast && <div className="toast" role="status">{toast}<span>✓</span></div>}
    </div>
  )
}
