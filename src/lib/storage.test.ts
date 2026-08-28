import { beforeEach, describe, expect, it } from 'vitest'
import { LEGACY_V2_KEY, STORAGE_KEY, loadData, saveData } from './storage'

function mockStorage() {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
  return store
}

describe('storage safety', () => {
  beforeEach(() => {
    mockStorage()
  })

  it('falls back to v2 when v3 JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    localStorage.setItem(LEGACY_V2_KEY, JSON.stringify({
      version: 2,
      currentDate: '2026-08-28',
      tasks: [{ id: 'kept', title: 'Survived', section: 'Morning', completed: false, createdAt: '2026-08-28T00:00:00.000Z', dueDate: '2026-08-28' }],
      routines: [],
      history: [],
      settings: { theme: 'light', defaultSection: 'Morning', dayStart: '06:00', onboardingComplete: true },
    }))
    const data = loadData(new Date(2026, 7, 28, 10))
    expect(data.tasks.some((task) => task.title === 'Survived')).toBe(true)
  })

  it('does not throw when persistence is blocked', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => { throw new Error('quota') },
        removeItem: () => undefined,
      },
    })
    expect(() => saveData(loadData(new Date(2026, 7, 28, 10)))).not.toThrow()
  })
})
