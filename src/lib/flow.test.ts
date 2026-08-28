import { describe, expect, it } from 'vitest'
import { parseBackup, serializeBackup } from './backup'
import { blankData } from './model'
import type { AppData, Routine, Task } from './model'
import {
  completeTask,
  ensureBusinessDay,
  generateRoutineTasks,
  removeRoutine,
  setRoutineActive,
  skipRoutineOccurrence,
  snapshotDay,
  tasksForDate,
} from './reset'

const at = (iso: string) => new Date(iso)

function addOneOff(data: AppData, title: string, dueDate: string): AppData {
  const task: Task = {
    id: `task-${title}`,
    title,
    section: 'Morning',
    completed: false,
    createdAt: `${dueDate}T08:00:00.000Z`,
    dueDate,
  }
  return { ...data, tasks: [...data.tasks, task] }
}

function addRoutine(data: AppData, id: string, title: string, frequency: Routine['frequency'] = 'Daily'): AppData {
  const routine: Routine = {
    id,
    title,
    section: 'Morning',
    frequency,
    active: true,
    currentStreak: 0,
    bestStreak: 0,
    completedDates: [],
    skippedDates: [],
    createdAt: '2026-08-24T08:00:00.000Z',
  }
  return generateRoutineTasks({ ...data, routines: [...data.routines, routine] }, data.currentDate)
}

describe('manual QA journey', () => {
  it('survives a week of ordinary use without losing identity or inventing duplicates', () => {
    let data = blankData('2026-08-24')
    data.settings.dayStart = '04:00'
    data.settings.onboardingComplete = true

    data = addOneOff(data, 'Write', '2026-08-24')
    data = completeTask(data, 'task-Write', '2026-08-24')
    expect(data.tasks.find((task) => task.id === 'task-Write')?.completed).toBe(true)

    data = completeTask(data, 'task-Write', '2026-08-24')
    expect(data.tasks.find((task) => task.id === 'task-Write')?.completed).toBe(false)

    data = addRoutine(data, 'r-read', 'Read')
    const firstOccurrence = tasksForDate(data.tasks, '2026-08-24').filter((task) => task.routineId === 'r-read')
    expect(firstOccurrence).toHaveLength(1)
    data = completeTask(data, firstOccurrence[0].id, '2026-08-24')
    expect(data.routines[0].currentStreak).toBe(1)

    data = setRoutineActive(data, 'r-read', false, '2026-08-24')
    expect(data.routines[0].active).toBe(false)
    expect(tasksForDate(data.tasks, '2026-08-24').some((task) => task.routineId === 'r-read' && !task.completed)).toBe(false)

    data = setRoutineActive(data, 'r-read', true, '2026-08-24')
    expect(data.routines[0].active).toBe(true)
    expect(tasksForDate(data.tasks, '2026-08-24').filter((task) => task.routineId === 'r-read')).toHaveLength(1)

    data = addOneOff(data, 'Call', '2026-08-24')

    data = ensureBusinessDay(data, at('2026-08-27T10:00:00')).data
    expect(data.currentDate).toBe('2026-08-27')
    expect(data.tasks.filter((task) => task.id === 'task-Call')).toHaveLength(1)
    expect(data.tasks.find((task) => task.id === 'task-Call')?.dueDate).toBe('2026-08-27')
    expect(data.tasks.find((task) => task.id === 'task-Call')?.carriedFrom).toBe('2026-08-24')
    expect(data.tasks.filter((task) => task.routineId === 'r-read')).toHaveLength(1)
    expect(data.routines[0].currentStreak).toBe(0)
    expect(data.history.map((day) => day.date)).toEqual(['2026-08-24', '2026-08-25', '2026-08-26'])

    const todayOcc = data.tasks.find((task) => task.routineId === 'r-read' && task.dueDate === '2026-08-27')
    expect(todayOcc).toBeTruthy()
    data = completeTask(data, todayOcc!.id, '2026-08-27')
    expect(data.routines[0].currentStreak).toBe(1)

    data = skipRoutineOccurrence(data, 'r-read', '2026-08-27')
    expect(data.tasks.some((task) => task.routineId === 'r-read' && task.dueDate === '2026-08-27')).toBe(false)
    data = generateRoutineTasks(data, '2026-08-27')
    expect(data.tasks.filter((task) => task.routineId === 'r-read' && task.dueDate === '2026-08-27')).toHaveLength(0)

    const exported = parseBackup(serializeBackup(data), '2026-08-27')
    expect(exported.ok).toBe(true)
    if (exported.ok) {
      expect(exported.data.tasks.some((task) => task.id === 'task-Call')).toBe(true)
      expect(exported.data.routines).toHaveLength(1)
    }

    data = removeRoutine(data, 'r-read')
    expect(data.routines).toHaveLength(0)
    expect(data.tasks.some((task) => task.routineId === 'r-read')).toBe(false)

    data.settings.dayStart = '04:00'
    const beforeBoundary = ensureBusinessDay(data, at('2026-08-28T03:30:00'))
    expect(beforeBoundary.data.currentDate).toBe('2026-08-27')
    const afterBoundary = ensureBusinessDay(data, at('2026-08-28T04:00:00'))
    expect(afterBoundary.data.currentDate).toBe('2026-08-28')
    expect(afterBoundary.data.tasks.find((task) => task.id === 'task-Call')?.dueDate).toBe('2026-08-28')

    const today = snapshotDay(afterBoundary.data, '2026-08-28')
    const live = tasksForDate(afterBoundary.data.tasks, '2026-08-28')
    expect(today.completed).toBe(live.filter((task) => task.completed).length)
    expect(today.total).toBe(live.length)
  })

  it('does not treat a one-off as a routine after carry-over', () => {
    let data = blankData('2026-08-26')
    data = addOneOff(data, 'Pay rent', '2026-08-26')
    data = ensureBusinessDay(data, at('2026-08-27T09:00:00')).data
    const carried = data.tasks.find((task) => task.id === 'task-Pay rent')
    expect(carried?.routineId).toBeUndefined()
    expect(data.routines).toHaveLength(0)
    data = generateRoutineTasks(data, '2026-08-27')
    expect(data.tasks.filter((task) => task.id === 'task-Pay rent')).toHaveLength(1)
  })
})
