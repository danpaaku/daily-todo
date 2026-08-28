import { daysBetween, isWeekday, prevDay } from './date'
import type { Frequency, Routine } from './model'

export function routineDueOn(routine: Routine, date: string): boolean {
  if (!routine.active) return false
  if (routine.skippedDates.includes(date)) return false
  if (routine.frequency === 'Daily') return true
  if (routine.frequency === 'Weekdays') return isWeekday(date)
  if (routine.frequency === 'Weekly') {
    if (!routine.lastCompletedDate) return true
    if (routine.lastCompletedDate === date) return true
    return daysBetween(routine.lastCompletedDate, date) >= 7
  }
  return false
}

export function weekdayStreakContinues(previous: string, date: string): boolean {
  let cursor = prevDay(date)
  while (cursor > previous) {
    if (isWeekday(cursor)) return false
    cursor = prevDay(cursor)
  }
  return previous < date && isWeekday(previous)
}

export function streakContinues(frequency: Frequency, previous: string, date: string): boolean {
  const gap = daysBetween(previous, date)
  if (gap <= 0) return false
  if (frequency === 'Daily') return gap === 1
  if (frequency === 'Weekdays') return weekdayStreakContinues(previous, date)
  return gap >= 7 && gap <= 14
}

export function applyCompletion(routine: Routine, date: string): Routine {
  if (routine.lastCompletedDate === date || routine.completedDates.includes(date)) {
    const completedDates = routine.completedDates.includes(date) ? routine.completedDates : [...routine.completedDates, date]
    return { ...routine, lastCompletedDate: date, completedDates }
  }
  const previous = routine.lastCompletedDate
  const next = previous && streakContinues(routine.frequency, previous, date) ? routine.currentStreak + 1 : 1
  return {
    ...routine,
    currentStreak: next,
    bestStreak: Math.max(routine.bestStreak, next),
    lastCompletedDate: date,
    completedDates: [...routine.completedDates, date],
    skippedDates: routine.skippedDates.filter((d) => d !== date),
  }
}

export function revertCompletion(routine: Routine, date: string): Routine {
  const completedDates = routine.completedDates.filter((d) => d !== date)
  const lastCompletedDate = completedDates.length ? [...completedDates].sort().at(-1) : undefined
  return {
    ...routine,
    completedDates,
    lastCompletedDate,
    currentStreak: Math.max(0, routine.currentStreak - 1),
  }
}

export function breakStreakIfMissed(routine: Routine, date: string): Routine {
  if (!routine.active) return routine
  if (!routineDueOn({ ...routine, skippedDates: [] }, date)) return routine
  if (routine.completedDates.includes(date)) return routine
  if (routine.skippedDates.includes(date)) return routine
  if (routine.currentStreak === 0) return routine
  return { ...routine, currentStreak: 0 }
}
