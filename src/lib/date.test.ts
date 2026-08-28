import { describe, expect, it } from 'vitest'
import {
  addDays,
  businessDayKey,
  calendarKey,
  daysBetween,
  eachDay,
  isDateKey,
  isWeekday,
  normalizeDayStart,
  parseDayStart,
} from './date'

describe('business day', () => {
  it('uses dayStart as the boundary', () => {
    const morning = new Date(2026, 7, 28, 3, 59, 0)
    const after = new Date(2026, 7, 28, 4, 0, 0)
    expect(businessDayKey(morning, '04:00')).toBe('2026-08-27')
    expect(businessDayKey(after, '04:00')).toBe('2026-08-28')
  })

  it('treats midnight start as the calendar date', () => {
    const justAfter = new Date(2026, 7, 28, 0, 0, 0)
    expect(businessDayKey(justAfter, '00:00')).toBe('2026-08-28')
  })

  it('normalizes invalid dayStart to 06:00', () => {
    expect(normalizeDayStart('25:99')).toBe('06:00')
    expect(parseDayStart('07:30')).toEqual({ hours: 7, minutes: 30 })
  })

  it('handles DST-safe day arithmetic via calendar keys', () => {
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(daysBetween('2026-08-01', '2026-08-08')).toBe(7)
    expect(eachDay('2026-08-26', '2026-08-28')).toEqual(['2026-08-26', '2026-08-27'])
  })

  it('validates keys and weekdays', () => {
    expect(isDateKey('2026-08-28')).toBe(true)
    expect(isDateKey('2026-13-01')).toBe(false)
    expect(isWeekday('2026-08-28')).toBe(true)
    expect(isWeekday('2026-08-29')).toBe(false)
    expect(calendarKey(new Date(2026, 7, 28, 23, 15))).toBe('2026-08-28')
  })
})
