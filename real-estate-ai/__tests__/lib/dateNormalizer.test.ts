import { isRegisteredDateInRange, normalizeRegisteredDate, registeredDateInputValue, registeredDateKey } from '@/lib/property/dateNormalizer'

describe('normalizeRegisteredDate', () => {
  it('formats slash month/day values with the default year', () => {
    expect(normalizeRegisteredDate('2/1')).toBe('2026. 2. 1.')
    expect(normalizeRegisteredDate('1/30')).toBe('2026. 1. 30.')
  })

  it('formats year-month-day variants consistently', () => {
    expect(normalizeRegisteredDate('2026-02-01')).toBe('2026. 2. 1.')
    expect(normalizeRegisteredDate('2026. 01. 30.')).toBe('2026. 1. 30.')
  })

  it('keeps unknown values instead of guessing', () => {
    expect(normalizeRegisteredDate('unknown')).toBe('unknown')
    expect(normalizeRegisteredDate('')).toBeNull()
  })

  it('creates sortable date keys for range filtering', () => {
    expect(registeredDateKey('2/1')).toBe(20260201)
    expect(registeredDateKey('2026. 1. 30.')).toBe(20260130)
    expect(registeredDateKey('unknown')).toBeNull()
  })

  it('creates date input values from practical date strings', () => {
    expect(registeredDateInputValue('2/1')).toBe('2026-02-01')
    expect(registeredDateInputValue('2026. 1. 30.')).toBe('2026-01-30')
    expect(registeredDateInputValue('unknown')).toBeNull()
  })

  it('checks whether registered dates are inside an inclusive range', () => {
    expect(isRegisteredDateInRange('2/1', '2026-02-01', '2026-02-28')).toBe(true)
    expect(isRegisteredDateInRange('1/30', '2026-02-01', '2026-02-28')).toBe(false)
    expect(isRegisteredDateInRange('2/28', '2026-02-01', '2026-02-28')).toBe(true)
  })
})
