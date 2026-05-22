const DATE_WITH_YEAR = /^(\d{4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})\.?$/
const DATE_WITHOUT_YEAR = /^(\d{1,2})[./-]\s*(\d{1,2})\.?$/
const KOREAN_DATE_WITH_YEAR = /^(\d{4})\s*\uB144\s*(\d{1,2})\s*\uC6D4\s*(\d{1,2})\s*\uC77C?$/
const KOREAN_DATE_WITHOUT_YEAR = /^(\d{1,2})\s*\uC6D4\s*(\d{1,2})\s*\uC77C?$/

function isValidMonthDay(month: number, day: number): boolean {
  return Number.isInteger(month) && Number.isInteger(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}. ${month}. ${day}.`
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function normalizeRegisteredDate(raw: string | null | undefined, defaultYear = 2026): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null

  const withYear = value.match(DATE_WITH_YEAR) ?? value.match(KOREAN_DATE_WITH_YEAR)
  if (withYear) {
    const year = Number(withYear[1])
    const month = Number(withYear[2])
    const day = Number(withYear[3])
    return isValidMonthDay(month, day) ? formatDate(year, month, day) : value
  }

  const withoutYear = value.match(DATE_WITHOUT_YEAR) ?? value.match(KOREAN_DATE_WITHOUT_YEAR)
  if (withoutYear) {
    const month = Number(withoutYear[1])
    const day = Number(withoutYear[2])
    return isValidMonthDay(month, day) ? formatDate(defaultYear, month, day) : value
  }

  return value
}

export function registeredDateKey(raw: string | null | undefined, defaultYear = 2026): number | null {
  const normalized = normalizeRegisteredDate(raw, defaultYear)
  if (!normalized) return null

  const match = normalized.match(DATE_WITH_YEAR)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidMonthDay(month, day)) return null

  return year * 10000 + month * 100 + day
}

export function registeredDateInputValue(raw: string | null | undefined, defaultYear = 2026): string | null {
  const key = registeredDateKey(raw, defaultYear)
  if (!key) return null

  const year = Math.floor(key / 10000)
  const month = Math.floor((key % 10000) / 100)
  const day = key % 100
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function isRegisteredDateInRange(
  raw: string | null | undefined,
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  const dateKey = registeredDateKey(raw)
  if (!dateKey) return false

  const fromKey = from ? registeredDateKey(from) : null
  const toKey = to ? registeredDateKey(to) : null

  if (fromKey && dateKey < fromKey) return false
  if (toKey && dateKey > toKey) return false
  return true
}
