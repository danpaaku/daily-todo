import type { HistoryDay } from './types'

type Props = {
  history: HistoryDay
  carriedCount: number
  onKeep: () => void
  onDismiss: () => void
}

export default function DailyReset({ history, carriedCount, onKeep, onDismiss }: Props) {
  return (
    <section className="reset-card" aria-live="polite">
      <div className="reset-symbol">↻</div>
      <div className="reset-copy">
        <span className="reset-eyebrow">NEW DAY</span>
        <h2>Yesterday is closed. Today is yours.</h2>
        <p>
          {history.completed} of {history.total} tasks completed
          {history.total ? ` · ${Math.round((history.completed / history.total) * 100)}% complete` : ''}.
          {carriedCount > 0
            ? ` ${carriedCount} unfinished task${carriedCount === 1 ? '' : 's'} came with you.`
            : ' Nothing unfinished was carried over.'}
        </p>
      </div>
      {carriedCount > 0 ? (
        <div className="reset-actions">
          <button className="reset-dismiss" onClick={onDismiss}>Dismiss</button>
          <button className="reset-keep" onClick={onKeep}>Keep for today</button>
        </div>
      ) : (
        <button className="reset-keep reset-single" onClick={onKeep}>Continue</button>
      )}
    </section>
  )
}
