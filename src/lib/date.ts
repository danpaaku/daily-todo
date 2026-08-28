const KEY_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function parseDayStart(value: string | undefined): { hours: number; minutes: number } {
  const match = TIME_RE.exec((value || '06:00').trim())
  if (!match) return { hours: 6, minutes: 0 }
  return { hours: Number(match[1]), minutes: Number(match[2]) }
}

export function normalizeDayStart(value: string | undefined): string {
  const { hours, minutes } = parseDayStart(value)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function calendarKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isDateKey(value: string): boolean {
  if (!KEY_RE.test(value)) return false
  const date = dateFromKey(value)
  return !Number.isNaN(date.getTime()) && calendarKey(date) === value
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function businessDayKey(now = new Date(), dayStart = '06:00'): string {
  const { hours, minutes } = parseDayStart(dayStart)
  const boundary = new Date(now)
  boundary.setHours(hours, minutes, 0, 0)
  const cursor = new Date(now)
  if (cursor < boundary) cursor.setDate(cursor.getDate() - 1)
  return calendarKey(cursor)
}

export function addDays(key: string, days: number): string {
  const date = dateFromKey(key)
  date.setDate(date.getDate() + days)
  return calendarKey(date)
}

export function nextDay(key: string): string {
  return addDays(key, 1)
}

export function prevDay(key: string): string {
  return addDays(key, -1)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((dateFromKey(b).getTime() - dateFromKey(a).getTime()) / 86_400_000)
}

export function isWeekday(key: string): boolean {
  const day = dateFromKey(key).getDay()
  return day >= 1 && day <= 5
}

export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function eachDay(from: string, toExclusive: string): string[] {
  const out: string[] = []
  if (!isDateKey(from) || !isDateKey(toExclusive)) return out
  let cursor = from
  let guard = 0
  while (cursor < toExclusive && guard < 4000) {
    out.push(cursor)
    cursor = nextDay(cursor)
    guard += 1
  }
  return out
}

export function formatLongDate(key: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(dateFromKey(key))
}

export function formatShortWeekday(key: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateFromKey(key))
}

export function formatPrettyDate(key: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(dateFromKey(key))
}

export function dateRangeEnding(endKey: string, days: number): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i -= 1) out.push(addDays(endKey, -i))
  return out
}
