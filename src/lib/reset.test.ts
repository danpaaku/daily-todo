import { describe, expect, it } from 'vitest'
import { blankData } from './model'
import { applyCompletion, routineDueOn, streakContinues } from './routines'
import { addRoutine, completeTask, ensureBusinessDay, generateRoutineTasks, snapshotDay } from './reset'
import type { Routine, Task } from './model'

const morning = (iso: string) => new Date(iso)

function routine(partial: Partial<Routine> = {}): Routine {
  return {
    id: 'r1',
    title: 'Read',
    section: 'Morning',
    frequency: 'Daily',
    active: true,
    currentStreak: 0,
    bestStreak: 0,
    completedDates: [],
    skippedDates: [],
    createdAt: '2026-08-20T00:00:00.000Z',
    ...partial,
  }
}

function task(partial: Partial<Task>): Task {
  return {
    id: 't1',
    title: 'Call mom',
    section: 'Morning',
    completed: false,
    createdAt: '2026-08-20T00:00:00.000Z',
    dueDate: '2026-08-27',
    ...partial,
  }
}

describe('routine scheduling', () => {
  it('respects daily, weekday and weekly rules', () => {
    expect(routineDueOn(routine({ frequency: 'Daily' }), '2026-08-29')).toBe(true)
    expect(routineDueOn(routine({ frequency: 'Weekdays' }), '2026-08-29')).toBe(false)
    expect(routineDueOn(routine({ frequency: 'Weekdays' }), '2026-08-28')).toBe(true)
    expect(routineDueOn(routine({ frequency: 'Weekly', lastCompletedDate: '2026-08-21' }), '2026-08-27')).toBe(false)
    expect(routineDueOn(routine({ frequency: 'Weekly', lastCompletedDate: '2026-08-21' }), '2026-08-28')).toBe(true)
    expect(routineDueOn(routine({ active: false }), '2026-08-28')).toBe(false)
  })

  it('continues weekday streaks across weekends', () => {
    expect(streakContinues('Weekdays', '2026-08-21', '2026-08-24')).toBe(true)
    expect(streakContinues('Weekdays', '2026-08-20', '2026-08-24')).toBe(false)
    expect(streakContinues('Daily', '2026-08-27', '2026-08-28')).toBe(true)
    expect(streakContinues('Weekly', '2026-08-14', '2026-08-21')).toBe(true)
  })
})

describe('daily reset', () => {
  it('carries incomplete one-off tasks without duplicating them', () => {
    const data = blankData('2026-08-26')
    data.settings.dayStart = '04:00'
    data.tasks = [task({ id: 'keep', dueDate: '2026-08-26' })]
    const reset = ensureBusinessDay(data, morning('2026-08-28T08:00:00'))
    const carried = reset.data.tasks.filter((item) => item.id === 'keep')
    expect(carried).toHaveLength(1)
    expect(carried[0].dueDate).toBe('2026-08-28')
    expect(carried[0].carriedFrom).toBe('2026-08-26')
    expect(reset.carried).toHaveLength(1)
    expect(reset.closedDays.map((day) => day.date)).toEqual(['2026-08-26', '2026-08-27'])
  })

  it('does not carry completed tasks or routine occurrences', () => {
    const data = blankData('2026-08-27')
    data.tasks = [
      task({ id: 'done', completed: true, dueDate: '2026-08-27' }),
      task({ id: 'routine', routineId: 'r1', dueDate: '2026-08-27' }),
    ]
    data.routines = [routine()]
    const reset = ensureBusinessDay(data, morning('2026-08-28T10:00:00'))
    expect(reset.data.tasks.some((item) => item.id === 'done')).toBe(false)
    expect(reset.data.tasks.some((item) => item.id === 'routine')).toBe(false)
    expect(reset.data.tasks.some((item) => item.routineId === 'r1' && item.dueDate === '2026-08-28')).toBe(true)
  })

  it('breaks a daily streak after a missed day', () => {
    const data = blankData('2026-08-26')
    data.routines = [routine({ currentStreak: 4, bestStreak: 4, lastCompletedDate: '2026-08-25', completedDates: ['2026-08-25'] })]
    const reset = ensureBusinessDay(data, morning('2026-08-28T10:00:00'))
    expect(reset.data.routines[0].currentStreak).toBe(0)
    expect(reset.data.routines[0].bestStreak).toBe(4)
  })

  it('does not regenerate a routine occurrence that already exists', () => {
    const data = blankData('2026-08-28')
    data.routines = [routine()]
    data.tasks = [task({ id: 'existing', routineId: 'r1', dueDate: '2026-08-28', title: 'Read' })]
    const next = generateRoutineTasks(data, '2026-08-28')
    expect(next.tasks.filter((item) => item.routineId === 'r1')).toHaveLength(1)
  })

  it('uses the custom dayStart when deciding whether to reset', () => {
    const data = blankData('2026-08-27')
    data.settings.dayStart = '04:00'
    data.tasks = [task({ id: 'open', dueDate: '2026-08-27' })]
    const beforeBoundary = ensureBusinessDay(data, new Date(2026, 7, 28, 3, 30))
    expect(beforeBoundary.changed).toBe(false)
    expect(beforeBoundary.data.currentDate).toBe('2026-08-27')
    const afterBoundary = ensureBusinessDay(data, new Date(2026, 7, 28, 4, 0))
    expect(afterBoundary.data.currentDate).toBe('2026-08-28')
  })

  it('keeps open one-off tasks when dayStart moves the clock backward', () => {
    const data = blankData('2026-08-28')
    data.settings.dayStart = '04:00'
    data.tasks = [task({ id: 'open', dueDate: '2026-08-28' })]
    const reset = ensureBusinessDay(data, new Date(2026, 7, 28, 3, 30))
    expect(reset.data.currentDate).toBe('2026-08-27')
    expect(reset.data.tasks.find((item) => item.id === 'open')?.dueDate).toBe('2026-08-27')
  })

  it('does not put a weekday routine on a Saturday', () => {
    const saturday = addRoutine(blankData('2026-08-29'), routine({ id: 'r-weekdays', frequency: 'Weekdays' }), '2026-08-29')
    expect(saturday.routines).toHaveLength(1)
    expect(saturday.tasks.filter((item) => item.routineId === 'r-weekdays')).toHaveLength(0)
    const monday = addRoutine(blankData('2026-08-24'), routine({ id: 'r-weekdays', frequency: 'Weekdays' }), '2026-08-24')
    expect(monday.tasks.filter((item) => item.routineId === 'r-weekdays')).toHaveLength(1)
  })
})

describe('history and completions', () => {
  it('snapshots the closed day from actual tasks', () => {
    const data = blankData('2026-08-27')
    data.tasks = [
      task({ id: 'a', completed: true, dueDate: '2026-08-27' }),
      task({ id: 'b', completed: false, dueDate: '2026-08-27' }),
      task({ id: 'c', routineId: 'r1', completed: true, dueDate: '2026-08-27' }),
    ]
    data.routines = [routine()]
    const snap = snapshotDay(data, '2026-08-27')
    expect(snap).toMatchObject({ completed: 2, total: 3, routinesCompleted: 1, routinesTotal: 1 })
  })

  it('updates streaks when a routine is completed', () => {
    const started = applyCompletion(routine({ currentStreak: 2, bestStreak: 2, lastCompletedDate: '2026-08-27', completedDates: ['2026-08-27'] }), '2026-08-28')
    expect(started.currentStreak).toBe(3)
    expect(started.bestStreak).toBe(3)
    const data = blankData('2026-08-28')
    data.routines = [routine()]
    data.tasks = [task({ id: 'occ', routineId: 'r1', dueDate: '2026-08-28' })]
    const next = completeTask(data, 'occ', '2026-08-28')
    expect(next.tasks[0].completed).toBe(true)
    expect(next.routines[0].completedDates).toContain('2026-08-28')
  })
})
