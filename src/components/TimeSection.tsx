import TaskRow from './TaskRow'
import type { Section, Task } from '../lib/model'

const meta: Record<Section, { eyebrow: string; icon: string; time: string }> = {
  Morning: { eyebrow: 'Start clear', icon: '☼', time: '05:00 — 12:00' },
  Afternoon: { eyebrow: 'Keep moving', icon: '◒', time: '12:00 — 18:00' },
  Evening: { eyebrow: 'Close well', icon: '☾', time: '18:00 — 05:00' },
}

type Props = {
  section: Section
  tasks: Task[]
  editingId: string | null
  editText: string
  active: boolean
  onToggle: (id: string) => void
  onStartEdit: (task: Task) => void
  onDelete: (id: string) => void
  onEditTextChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function TimeSection({ section, tasks, editingId, editText, active, onToggle, onStartEdit, onDelete, onEditTextChange, onSave, onCancel }: Props) {
  const completed = tasks.filter((task) => task.completed).length
  return (
    <section className={`day-section ${active ? 'is-current' : ''}`} aria-label={section}>
      <div className="section-head">
        <div className="section-title">
          <span className="section-icon" aria-hidden="true">{meta[section].icon}</span>
          <div>
            <div className="section-kicker">{active && <span className="now-pill">NOW</span>}{meta[section].eyebrow}</div>
            <h2>{section}</h2>
            <p>{meta[section].time}</p>
          </div>
        </div>
        <div className="section-score"><b>{completed}</b><span>/{tasks.length}</span></div>
      </div>
      <div className="section-progress"><span style={{ width: `${tasks.length ? Math.round(completed / tasks.length * 100) : 0}%` }} /></div>
      <div className="task-list">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            editing={editingId === task.id}
            editText={editText}
            onToggle={() => onToggle(task.id)}
            onStartEdit={() => onStartEdit(task)}
            onDelete={() => onDelete(task.id)}
            onEditTextChange={onEditTextChange}
            onSave={onSave}
            onCancel={onCancel}
          />
        ))}
        {tasks.length === 0 && (
          <div className="empty">
            <span className="empty-mark">＋</span>
            <b>Nothing planned</b>
            <span>Add something when you know what this part of the day needs.</span>
          </div>
        )}
      </div>
    </section>
  )
}
