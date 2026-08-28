import type { Task } from '../lib/model'

type Props = {
  task: Task
  editing: boolean
  editText: string
  onToggle: () => void
  onStartEdit: () => void
  onDelete: () => void
  onEditTextChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function TaskRow({ task, editing, editText, onToggle, onStartEdit, onDelete, onEditTextChange, onSave, onCancel }: Props) {
  if (editing) {
    return (
      <article className="task editing">
        <div className="edit-line">
          <input
            autoFocus
            aria-label="Edit task title"
            value={editText}
            onChange={(event) => onEditTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSave()
              if (event.key === 'Escape') onCancel()
            }}
          />
          <button type="button" onClick={onSave}>Save</button>
          <button type="button" className="edit-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </article>
    )
  }

  const meta = task.routineId
    ? 'Routine · repeats automatically'
    : task.carriedFrom
      ? `Carried from ${task.carriedFrom}`
      : null

  return (
    <article className={`task ${task.completed ? 'is-done' : ''} ${task.carriedFrom ? 'is-carried' : ''}`}>
      <button type="button" className="task-check" onClick={onToggle} aria-label={task.completed ? 'Mark incomplete' : 'Complete task'}>
        {task.completed ? '✓' : ''}
      </button>
      <button type="button" className="task-body" onClick={onToggle}>
        <span className="task-name">{task.title}</span>
        {meta && (
          <span className="task-meta">
            <span className="routine-mark">{task.routineId ? '↻' : '→'}</span>
            {meta}
          </span>
        )}
      </button>
      <div className="task-actions">
        <button type="button" onClick={onStartEdit}>Edit</button>
        <button type="button" onClick={onDelete} aria-label={`Delete ${task.title}`}>×</button>
      </div>
    </article>
  )
}
