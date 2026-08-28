import { SECTIONS } from '../lib/model'
import type { Frequency, Routine, Section } from '../lib/model'
import { routineDueOn } from '../lib/routines'

type Props = {
  routines: Routine[]
  today: string
  open: boolean
  title: string
  section: Section
  frequency: Frequency
  editingId: string | null
  onOpen: () => void
  onClose: () => void
  onTitle: (value: string) => void
  onSection: (value: Section) => void
  onFrequency: (value: Frequency) => void
  onCreate: () => void
  onToggle: (id: string) => void
  onToggleActive: (id: string) => void
  onEdit: (routine: Routine) => void
  onDelete: (id: string) => void
}

export default function RoutineView(props: Props) {
  const activeRoutines = props.routines.filter((routine) => routine.active)
  const best = Math.max(0, ...props.routines.map((routine) => routine.bestStreak))
  const totalCompletions = props.routines.reduce((sum, routine) => sum + routine.completedDates.length, 0)
  const dueToday = activeRoutines.filter((routine) => routineDueOn(routine, props.today)).length

  return (
    <section className="page-view">
      <div className="page-heading">
        <div>
          <div className="micro">CONSISTENCY OVER INTENSITY</div>
          <h1>Your <i>routines.</i></h1>
          <p>Things worth repeating become things worth keeping.</p>
        </div>
        <button type="button" className="primary" onClick={props.onOpen}>+ New routine</button>
      </div>

      {props.open && (
        <div className="routine-composer" role="dialog" aria-label={props.editingId ? 'Edit routine' : 'New routine'}>
          <div className="routine-composer-heading">
            <span>{props.editingId ? 'EDIT ROUTINE' : 'NEW ROUTINE'}</span>
            <strong>{props.editingId ? 'Shape the routine around your real life.' : 'Make something worth repeating.'}</strong>
          </div>
          <input
            autoFocus
            aria-label="Routine title"
            placeholder="e.g. Read for 20 minutes"
            value={props.title}
            onChange={(event) => props.onTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') props.onCreate()
              if (event.key === 'Escape') props.onClose()
            }}
          />
          <select aria-label="Routine section" value={props.section} onChange={(event) => props.onSection(event.target.value as Section)}>
            {SECTIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Routine frequency" value={props.frequency} onChange={(event) => props.onFrequency(event.target.value as Frequency)}>
            <option>Daily</option>
            <option>Weekdays</option>
            <option>Weekly</option>
          </select>
          <button type="button" onClick={props.onCreate}>{props.editingId ? 'Save' : 'Create'}</button>
          <button type="button" className="cancel" onClick={props.onClose}>Cancel</button>
        </div>
      )}

      <div className="routine-stats">
        <div><span>ACTIVE</span><b>{activeRoutines.length}<small> / {props.routines.length}</small></b><em>{dueToday} due today</em></div>
        <div><span>BEST STREAK</span><b>{best}<small> days</small></b><em>personal best</em></div>
        <div><span>COMPLETIONS</span><b>{totalCompletions}</b><em>all time</em></div>
      </div>

      <div className="routine-list">
        {props.routines.map((routine) => (
          <article className={`routine-card ${!routine.active ? 'is-paused' : ''}`} key={routine.id}>
            <div className="routine-orb" aria-hidden="true">{routine.active ? '↻' : 'Ⅱ'}</div>
            <div className="routine-info">
              <div className="routine-title-line">
                <h2>{routine.title}</h2>
                {!routine.active && <span className="paused-pill">PAUSED</span>}
              </div>
              <p>{routine.frequency.toLowerCase()} · {routine.section} · {routine.completedDates.length} completions</p>
            </div>
            <div className="streak"><b>🔥 {routine.currentStreak}</b><span>current streak</span><small>best {routine.bestStreak}</small></div>
            {routine.active && <button type="button" className="routine-toggle" onClick={() => props.onToggle(routine.id)}>Today</button>}
            <button type="button" className="routine-action" onClick={() => props.onEdit(routine)}>Edit</button>
            <button type="button" className="routine-action" onClick={() => props.onToggleActive(routine.id)}>{routine.active ? 'Pause' : 'Resume'}</button>
            <button type="button" className="icon-btn" onClick={() => props.onDelete(routine.id)} aria-label={`Delete ${routine.title}`}>×</button>
          </article>
        ))}
        {props.routines.length === 0 && (
          <div className="big-empty">
            <div>✦</div>
            <h2>Nothing recurring yet.</h2>
            <p>Turn something worth doing into a routine. Your history and streak start here.</p>
            <button type="button" className="primary" onClick={props.onOpen}>Create a routine</button>
          </div>
        )}
      </div>
    </section>
  )
}
