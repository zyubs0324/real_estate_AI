export type SortDirection = 'asc' | 'desc'

export type SortState<Key extends string> = {
  key: Key
  direction: SortDirection
}

export function nextSortState<Key extends string>(current: SortState<Key>, key: Key): SortState<Key> {
  if (current.key !== key) return { key, direction: 'asc' }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === ''
}

export function compareText(a: unknown, b: unknown, direction: SortDirection): number {
  if (isBlank(a) && isBlank(b)) return 0
  if (isBlank(a)) return 1
  if (isBlank(b)) return -1

  const result = String(a).localeCompare(String(b), 'ko-KR', {
    numeric: true,
    sensitivity: 'base',
  })
  return direction === 'asc' ? result : -result
}

export function compareNumber(a: unknown, b: unknown, direction: SortDirection): number {
  const left = typeof a === 'number' ? a : Number(a)
  const right = typeof b === 'number' ? b : Number(b)
  const leftMissing = Number.isNaN(left)
  const rightMissing = Number.isNaN(right)

  if (leftMissing && rightMissing) return 0
  if (leftMissing) return 1
  if (rightMissing) return -1

  const result = left - right
  return direction === 'asc' ? result : -result
}

export function compareDate(a: unknown, b: unknown, direction: SortDirection): number {
  return compareNumber(parseDateValue(a), parseDateValue(b), direction)
}

export function parseDateValue(value: unknown): number {
  if (isBlank(value)) return Number.NaN
  const parsed = new Date(String(value).replace(/\./g, '-')).getTime()
  return Number.isNaN(parsed) ? Number.NaN : parsed
}

export function parseNumberText(value: unknown): number {
  if (isBlank(value)) return Number.NaN
  const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : Number.NaN
}

export function parseKoreanPrice(value: unknown): number {
  if (typeof value === 'number') return value
  if (isBlank(value)) return Number.NaN

  const text = String(value).replace(/,/g, '').replace(/\s+/g, '')
  const eok = text.match(/(\d+(?:\.\d+)?)억/)
  const man = text.match(/(\d+(?:\.\d+)?)만/)
  const plain = text.match(/^\d+(?:\.\d+)?$/)

  let total = 0
  if (eok) total += Number(eok[1]) * 10000
  if (man) total += Number(man[1])
  if (!eok && !man && plain) total += Number(plain[0])

  return total > 0 ? total : Number.NaN
}
