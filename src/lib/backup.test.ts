import { describe, expect, it } from 'vitest'
import { parseBackup, serializeBackup } from './backup'
import { blankData } from './model'
import { sanitizeData } from './storage'

describe('backup and migration', () => {
  it('round-trips a valid export', () => {
    const data = blankData('2026-08-28')
    data.tasks.push({
      id: 't1',
      title: 'Write',
      section: 'Afternoon',
      completed: false,
      createdAt: '2026-08-28T10:00:00.000Z',
      dueDate: '2026-08-28',
    })
    const parsed = parseBackup(serializeBackup(data), '2026-08-28')
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.preview.tasks).toBe(1)
      expect(parsed.data.tasks[0].title).toBe('Write')
    }
  })

  it('rejects malformed JSON without throwing', () => {
    const parsed = parseBackup('{not json', '2026-08-28')
    expect(parsed.ok).toBe(false)
  })

  it('rejects payloads that are missing collections', () => {
    const parsed = parseBackup(JSON.stringify({ version: 3, tasks: [] }), '2026-08-28')
    expect(parsed.ok).toBe(false)
  })

  it('sanitizes older or messy records instead of crashing', () => {
    const cleaned = sanitizeData({
      version: 2,
      currentDate: 'not-a-date',
      tasks: [{ title: '  Keep me  ', dueDate: '2026-08-28', section: 'Night' }, { title: '', dueDate: '2026-08-28' }],
      routines: [{ title: 'Stretch', frequency: 'Sometimes', completedDates: ['nope', '2026-08-01', '2026-08-01'] }],
      history: [{ date: '2026-08-01', completed: '2', total: 3 }],
      settings: { theme: 'purple', dayStart: '25:00' },
    }, '2026-08-28')
    expect(cleaned.currentDate).toBe('2026-08-28')
    expect(cleaned.tasks).toHaveLength(1)
    expect(cleaned.tasks[0].section).toBe('Morning')
    expect(cleaned.routines[0].frequency).toBe('Daily')
    expect(cleaned.routines[0].completedDates).toEqual(['2026-08-01'])
    expect(cleaned.settings.theme).toBe('light')
    expect(cleaned.settings.dayStart).toBe('06:00')
    expect(cleaned.history[0].completed).toBe(2)
  })
})
