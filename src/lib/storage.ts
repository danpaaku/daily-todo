import { businessDayKey, isDateKey, normalizeDayStart } from './date'
import { uid, nowIso } from './ids'
import {
  type AppData,
  type AppSettings,
  type Frequency,
  type HistoryDay,
  type Routine,
  type Section,
  type Task,
  SCHEMA_VERSION,
  blankData,
  defaultSettings,
  isFrequency,
  isSection,
  isTheme,
} from './model'

export const STORAGE_KEY = 'daily.todo.v3'
export const LEGACY_V2_KEY = 'daily.todo.v2'
export const LEGACY_TASKS_KEY = 'daily.tasks'
export const LEGACY_HISTORY_KEY = 'daily.history'

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function sanitizeSection(value: unknown): Section {
  return isSection(value) ? value : 'Morning'
}

function sanitizeFrequency(value: unknown): Frequency {
  return isFrequency(value) ? value : 'Daily'
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const key = String(value)
    if (!isDateKey(key) || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out.sort()
}

export function sanitizeSettings(raw: unknown): AppSettings {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const defaults = defaultSettings()
  return {
    theme: isTheme(source.theme) ? source.theme : defaults.theme,
    defaultSection: sanitizeSection(source.defaultSection),
    dayStart: normalizeDayStart(asString(source.dayStart, defaults.dayStart)),
    onboardingComplete: Boolean(source.onboardingComplete),
  }
}

export function sanitizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const title = asString(source.title).trim()
  const dueDate = asString(source.dueDate)
  if (!title || !isDateKey(dueDate)) return null
  const completed = Boolean(source.completed)
  const routineId = asString(source.routineId) || undefined
  const carriedFrom = asString(source.carriedFrom)
  return {
    id: asString(source.id) || uid(),
    title: title.slice(0, 240),
    section: sanitizeSection(source.section),
    completed,
    createdAt: asString(source.createdAt) || nowIso(),
    dueDate,
    routineId,
    completedAt: completed ? asString(source.completedAt) || nowIso() : undefined,
    carriedFrom: isDateKey(carriedFrom) ? carriedFrom : undefined,
  }
}

export function sanitizeRoutine(raw: unknown): Routine | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const title = asString(source.title).trim()
  if (!title) return null
  const completedDates = uniqueStrings(source.completedDates)
  const lastCompletedDate = isDateKey(asString(source.lastCompletedDate)) ? asString(source.lastCompletedDate) : completedDates.at(-1)
  const currentStreak = Math.max(0, Math.floor(asNumber(source.currentStreak)))
  const bestStreak = Math.max(currentStreak, Math.floor(asNumber(source.bestStreak)))
  return {
    id: asString(source.id) || uid(),
    title: title.slice(0, 240),
    section: sanitizeSection(source.section),
    frequency: sanitizeFrequency(source.frequency),
    active: source.active !== false,
    currentStreak,
    bestStreak,
    lastCompletedDate,
    completedDates,
    skippedDates: uniqueStrings(source.skippedDates),
    createdAt: asString(source.createdAt) || nowIso(),
    pausedAt: source.active === false ? asString(source.pausedAt) || nowIso() : undefined,
  }
}

export function sanitizeHistory(raw: unknown): HistoryDay | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const date = asString(source.date)
  if (!isDateKey(date)) return null
  return {
    date,
    completed: Math.max(0, Math.floor(asNumber(source.completed))),
    total: Math.max(0, Math.floor(asNumber(source.total))),
    routinesCompleted: Math.max(0, Math.floor(asNumber(source.routinesCompleted))),
    routinesTotal: Math.max(0, Math.floor(asNumber(source.routinesTotal))),
  }
}

export function sanitizeData(raw: unknown, fallbackDate: string): AppData {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const tasks = Array.isArray(source.tasks) ? source.tasks.map(sanitizeTask).filter((task): task is Task => Boolean(task)) : []
  const routines = Array.isArray(source.routines) ? source.routines.map(sanitizeRoutine).filter((routine): routine is Routine => Boolean(routine)) : []
  const historyMap = new Map<string, HistoryDay>()
  if (Array.isArray(source.history)) {
    for (const item of source.history) {
      const entry = sanitizeHistory(item)
      if (entry) historyMap.set(entry.date, entry)
    }
  }
  const currentDate = isDateKey(asString(source.currentDate)) ? asString(source.currentDate) : fallbackDate
  return {
    version: SCHEMA_VERSION,
    currentDate,
    tasks,
    routines,
    history: [...historyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    settings: sanitizeSettings(source.settings),
  }
}

function migrateLegacyV1(now = new Date()): AppData {
  const today = businessDayKey(now, defaultSettings().dayStart)
  try {
    const rawTasks = JSON.parse(localStorage.getItem(LEGACY_TASKS_KEY) || 'null') as Array<Record<string, unknown>> | null
    const rawHistory = JSON.parse(localStorage.getItem(LEGACY_HISTORY_KEY) || 'null') as Array<Record<string, unknown>> | null
    if (!rawTasks && !rawHistory) return blankData(today)
    const routines: Routine[] = []
    const tasks: Task[] = (rawTasks || []).map((old) => {
      const recurring = Boolean(old.recurring)
      let routineId: string | undefined
      if (recurring) {
        routineId = uid()
        const completedDates = uniqueStrings(old.completedDates)
        routines.push({
          id: routineId,
          title: asString(old.title, 'Routine').slice(0, 240),
          section: sanitizeSection(old.section),
          frequency: sanitizeFrequency(old.frequency),
          active: true,
          currentStreak: Math.max(0, Math.floor(asNumber(old.streak))),
          bestStreak: Math.max(0, Math.floor(asNumber(old.streak))),
          lastCompletedDate: completedDates.at(-1),
          completedDates,
          skippedDates: [],
          createdAt: nowIso(now),
        })
      }
      return {
        id: asString(old.id) || uid(),
        title: asString(old.title).slice(0, 240),
        section: sanitizeSection(old.section),
        completed: Boolean(old.completed),
        createdAt: nowIso(now),
        dueDate: today,
        routineId,
        completedAt: old.completed ? nowIso(now) : undefined,
      }
    }).filter((task) => task.title)
    const history = (rawHistory || []).map(sanitizeHistory).filter((item): item is HistoryDay => Boolean(item))
    return { version: SCHEMA_VERSION, currentDate: today, tasks, routines, history, settings: defaultSettings() }
  } catch {
    return blankData(today)
  }
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function hydrate(raw: unknown, now: Date, fallback: string): AppData {
  const data = sanitizeData(raw, fallback)
  const today = businessDayKey(now, data.settings.dayStart)
  return data.currentDate ? data : { ...data, currentDate: today }
}

export function loadData(now = new Date()): AppData {
  const fallback = businessDayKey(now, defaultSettings().dayStart)
  const current = readJson(STORAGE_KEY)
  if (current) return hydrate(current, now, fallback)
  const v2 = readJson(LEGACY_V2_KEY)
  if (v2) return hydrate(v2, now, fallback)
  return migrateLegacyV1(now)
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Private mode or quota: keep the live session instead of crashing.
  }
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_V2_KEY)
  localStorage.removeItem(LEGACY_TASKS_KEY)
  localStorage.removeItem(LEGACY_HISTORY_KEY)
}
