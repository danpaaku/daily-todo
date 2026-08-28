export type Section = 'Morning' | 'Afternoon' | 'Evening'
export type Frequency = 'Daily' | 'Weekdays' | 'Weekly'
export type View = 'today' | 'routines' | 'history' | 'settings'
export type Filter = 'all' | 'open' | 'done'
export type Theme = 'light' | 'dark'
export const SCHEMA_VERSION = 3 as const
export type SchemaVersion = typeof SCHEMA_VERSION

export const SECTIONS: Section[] = ['Morning', 'Afternoon', 'Evening']
export const FREQUENCIES: Frequency[] = ['Daily', 'Weekdays', 'Weekly']

export type Routine = {
  id: string
  title: string
  section: Section
  frequency: Frequency
  active: boolean
  currentStreak: number
  bestStreak: number
  lastCompletedDate?: string
  completedDates: string[]
  skippedDates: string[]
  createdAt: string
  pausedAt?: string
}

export type Task = {
  id: string
  title: string
  section: Section
  completed: boolean
  createdAt: string
  dueDate: string
  routineId?: string
  completedAt?: string
  carriedFrom?: string
}

export type HistoryDay = {
  date: string
  completed: number
  total: number
  routinesCompleted: number
  routinesTotal: number
}

export type AppSettings = {
  theme: Theme
  defaultSection: Section
  dayStart: string
  onboardingComplete: boolean
}

export type AppData = {
  version: SchemaVersion
  currentDate: string
  tasks: Task[]
  routines: Routine[]
  history: HistoryDay[]
  settings: AppSettings
}

export function isSection(value: unknown): value is Section {
  return value === 'Morning' || value === 'Afternoon' || value === 'Evening'
}

export function isFrequency(value: unknown): value is Frequency {
  return value === 'Daily' || value === 'Weekdays' || value === 'Weekly'
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function defaultSettings(): AppSettings {
  return { theme: 'light', defaultSection: 'Morning', dayStart: '06:00', onboardingComplete: false }
}

export function blankData(currentDate: string): AppData {
  return { version: SCHEMA_VERSION, currentDate, tasks: [], routines: [], history: [], settings: defaultSettings() }
}

export function percent(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0
}
