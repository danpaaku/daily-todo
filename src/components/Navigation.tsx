import type { View } from '../lib/model'

type Props = { view: View; routineCount: number; onChange: (view: View) => void }

export default function Navigation({ view, routineCount, onChange }: Props) {
  return (
    <nav className="nav-tabs" aria-label="Primary">
      <button type="button" className={view === 'today' ? 'active' : ''} aria-current={view === 'today' ? 'page' : undefined} onClick={() => onChange('today')}>Today</button>
      <button type="button" className={view === 'routines' ? 'active' : ''} aria-current={view === 'routines' ? 'page' : undefined} onClick={() => onChange('routines')}>Routines <em>{routineCount}</em></button>
      <button type="button" className={view === 'history' ? 'active' : ''} aria-current={view === 'history' ? 'page' : undefined} onClick={() => onChange('history')}>History</button>
    </nav>
  )
}
