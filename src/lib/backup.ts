import { isDateKey } from './date'
import { sanitizeData } from './storage'
import type { AppData } from './model'
import { SCHEMA_VERSION } from './model'
import { nowIso } from './ids'

export type BackupFile = {
  app: 'Daily'
  version: typeof SCHEMA_VERSION
  exportedAt: string
  data: AppData
}

export type BackupPreview = {
  tasks: number
  routines: number
  history: number
  currentDate: string
  onboardingComplete: boolean
}

export function parseBackup(text: string, fallbackDate: string): { ok: true; data: AppData; preview: BackupPreview } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'That backup is empty or unreadable.' }
  const root = parsed as Record<string, unknown>
  const incoming = root.data && typeof root.data === 'object' ? root.data : parsed
  if (!incoming || typeof incoming !== 'object') return { ok: false, error: 'That backup is missing application data.' }
  const record = incoming as Record<string, unknown>
  if (!Array.isArray(record.tasks) || !Array.isArray(record.routines) || !Array.isArray(record.history)) {
    return { ok: false, error: 'That backup does not match the Daily format.' }
  }
  const data = sanitizeData(incoming, fallbackDate)
  return {
    ok: true,
    data,
    preview: {
      tasks: data.tasks.length,
      routines: data.routines.length,
      history: data.history.length,
      currentDate: isDateKey(data.currentDate) ? data.currentDate : fallbackDate,
      onboardingComplete: data.settings.onboardingComplete,
    },
  }
}

export function serializeBackup(data: AppData): string {
  const payload: BackupFile = {
    app: 'Daily',
    version: SCHEMA_VERSION,
    exportedAt: nowIso(),
    data,
  }
  return JSON.stringify(payload, null, 2)
}

export function describePreview(preview: BackupPreview): string {
  return [
    `Import this backup?`,
    `${preview.tasks} tasks, ${preview.routines} routines, ${preview.history} history days.`,
    `This replaces the data currently stored in this browser.`,
  ].join('\n')
}
