import { businessDayKey, compareKeys, eachDay, nextDay } from './date'
import { uid, nowIso } from './ids'
import type { AppData, HistoryDay, Routine, Task } from './model'
import { applyCompletion, breakStreakIfMissed, revertCompletion, routineDueOn } from './routines'

export type ResetResult = {
  data: AppData
  carried: Task[]
  closedDays: HistoryDay[]
  changed: boolean
}

export function tasksForDate(tasks: Task[], date: string): Task[] {
  return tasks.filter((task) => task.dueDate === date)
}

export function snapshotDay(data: AppData, date: string): HistoryDay {
  const dayTasks = tasksForDate(data.tasks, date)
  return {
    date,
    completed: dayTasks.filter((task) => task.completed).length,
    total: dayTasks.length,
    routinesCompleted: dayTasks.filter((task) => task.routineId && task.completed).length,
    routinesTotal: data.routines.filter((routine) => routineDueOn(routine, date) || dayTasks.some((task) => task.routineId === routine.id)).length,
  }
}

export function upsertHistory(history: HistoryDay[], entry: HistoryDay): HistoryDay[] {
  const index = history.findIndex((item) => item.date === entry.date)
  if (index === -1) return [...history, entry].sort((a, b) => compareKeys(a.date, b.date))
  const next = history.slice()
  next[index] = entry
  return next
}

export function addRoutine(data: AppData, routine: Routine, date: string, createdAt = nowIso()): AppData {
  const withRoutine = { ...data, routines: [...data.routines, routine] }
  if (!routineDueOn(routine, date)) return withRoutine
  return {
    ...withRoutine,
    tasks: [...withRoutine.tasks, {
      id: uid(),
      title: routine.title,
      section: routine.section,
      completed: false,
      createdAt,
      dueDate: date,
      routineId: routine.id,
    }],
  }
}

export function generateRoutineTasks(data: AppData, date: string, createdAt = nowIso()): AppData {
  const existing = new Set(
    data.tasks.filter((task) => task.dueDate === date && task.routineId).map((task) => task.routineId as string),
  )
  const generated: Task[] = data.routines
    .filter((routine) => routineDueOn(routine, date) && !existing.has(routine.id))
    .map((routine) => ({
      id: uid(),
      title: routine.title,
      section: routine.section,
      completed: false,
      createdAt,
      dueDate: date,
      routineId: routine.id,
    }))
  if (!generated.length) return data.currentDate === date ? data : { ...data, currentDate: date }
  return { ...data, currentDate: date, tasks: [...data.tasks, ...generated] }
}

function carryIncompleteOneOffs(tasks: Task[], toDate: string): { tasks: Task[]; carried: Task[] } {
  const carried: Task[] = []
  const nextTasks = tasks.map((task) => {
    if (task.completed || task.routineId || task.dueDate >= toDate) return task
    const moved: Task = { ...task, dueDate: toDate, carriedFrom: task.carriedFrom || task.dueDate }
    carried.push(moved)
    return moved
  })
  return { tasks: nextTasks, carried }
}

function pruneTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter((task) => {
    if (task.dueDate >= today) return true
    if (!task.completed && !task.routineId) return true
    return false
  })
}

function closeDate(data: AppData, date: string): { data: AppData; history: HistoryDay } {
  const historyEntry = snapshotDay(data, date)
  const routines = data.routines.map((routine) => breakStreakIfMissed(routine, date))
  return {
    data: { ...data, routines, history: upsertHistory(data.history, historyEntry) },
    history: historyEntry,
  }
}

export function ensureBusinessDay(data: AppData, now = new Date()): ResetResult {
  const today = businessDayKey(now, data.settings.dayStart)
  if (data.currentDate === today) {
    const generated = generateRoutineTasks(data, today)
    return { data: generated, carried: [], closedDays: [], changed: generated !== data }
  }
  if (!data.currentDate) {
    const generated = generateRoutineTasks({ ...data, currentDate: today }, today)
    return { data: generated, carried: [], closedDays: [], changed: true }
  }

  if (data.currentDate > today) {
    const moved = data.tasks.map((task) => {
      if (task.completed || task.routineId || task.dueDate !== data.currentDate) return task
      return { ...task, dueDate: today, carriedFrom: task.carriedFrom || task.dueDate }
    })
    const generated = generateRoutineTasks({ ...data, currentDate: today, tasks: moved }, today)
    return { data: generated, carried: [], closedDays: [], changed: true }
  }

  let working = data
  const closedDays: HistoryDay[] = []
  const daysToClose = eachDay(data.currentDate, today)
  for (const date of daysToClose) {
    const closed = closeDate(working, date)
    working = { ...closed.data, currentDate: nextDay(date) }
    closedDays.push(closed.history)
  }

  const moved = carryIncompleteOneOffs(working.tasks, today)
  working = generateRoutineTasks({ ...working, tasks: pruneTasks(moved.tasks, today), currentDate: today }, today)
  return { data: working, carried: moved.carried, closedDays, changed: true }
}

export function completeTask(data: AppData, taskId: string, date: string, at = nowIso()): AppData {
  const target = data.tasks.find((task) => task.id === taskId)
  if (!target || target.dueDate !== date) return data
  const completing = !target.completed
  const tasks = data.tasks.map((task) => (
    task.id === taskId
      ? { ...task, completed: completing, completedAt: completing ? at : undefined }
      : task
  ))
  if (!target.routineId) return { ...data, tasks }
  const routines = data.routines.map((routine) => {
    if (routine.id !== target.routineId) return routine
    return completing ? applyCompletion(routine, date) : revertCompletion(routine, date)
  })
  return { ...data, tasks, routines }
}

export function skipRoutineOccurrence(data: AppData, routineId: string, date: string): AppData {
  const occurrence = data.tasks.find((task) => task.routineId === routineId && task.dueDate === date)
  return {
    ...data,
    routines: data.routines.map((routine) => {
      if (routine.id !== routineId) return routine
      const skipped = {
        ...routine,
        skippedDates: routine.skippedDates.includes(date) ? routine.skippedDates : [...routine.skippedDates, date],
      }
      return occurrence?.completed ? revertCompletion(skipped, date) : skipped
    }),
    tasks: data.tasks.filter((task) => !(task.routineId === routineId && task.dueDate === date)),
  }
}

export function removeRoutine(data: AppData, routineId: string): AppData {
  return {
    ...data,
    routines: data.routines.filter((routine) => routine.id !== routineId),
    tasks: data.tasks.filter((task) => task.routineId !== routineId),
  }
}

export function setRoutineActive(data: AppData, routineId: string, active: boolean, date: string, at = nowIso()): AppData {
  const routines = data.routines.map((routine) => {
    if (routine.id !== routineId) return routine
    return active
      ? { ...routine, active: true, pausedAt: undefined }
      : { ...routine, active: false, pausedAt: at }
  })
  const tasks = active
    ? data.tasks
    : data.tasks.filter((task) => !(task.routineId === routineId && task.dueDate === date && !task.completed))
  return generateRoutineTasks({ ...data, routines, tasks }, date, at)
}

export function syncRoutineOccurrence(data: AppData, routine: Routine, date: string): AppData {
  return {
    ...data,
    routines: data.routines.map((item) => item.id === routine.id ? routine : item),
    tasks: data.tasks.map((task) => (
      task.routineId === routine.id && task.dueDate === date && !task.completed
        ? { ...task, title: routine.title, section: routine.section }
        : task
    )),
  }
}

export function todayScore(tasks: Task[]): { done: number; total: number; percent: number } {
  const total = tasks.length
  const done = tasks.filter((task) => task.completed).length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}
