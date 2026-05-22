export interface DuplicateCandidateProperty {
  id: string
  road_address: string
  building_name?: string | null
  alias?: string | null
  unit_number?: string | null
}

function compact(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\uB9E8\uC158/g, '\uB9E8\uC20C') // 맨션 -> 맨숀
    .replace(/\s+/g, '')
}

function extractUnit(value: string): string | null {
  const matches = Array.from(value.matchAll(/\d{2,5}/g)).map((match) => match[0])
  if (matches.length === 0) return null
  return matches[matches.length - 1].replace(/^0+/, '') || matches[matches.length - 1]
}

function buildingPart(row: DuplicateCandidateProperty): string | null {
  const raw = compact([row.alias, row.building_name, row.road_address].filter(Boolean).join(' '))
    .replace(/\d+/g, '')
    .replace(/[.,()[\]{}'"`~!@#$%^&*_+=|\\:;?/<>\-]/g, '')
    .replace(/\uD638/g, '') // 호
    .replace(/\uB3D9/g, '') // 동
    .replace(/\uC544\uD30C\uD2B8/g, '') // 아파트
    .replace(/\uBE4C\uB77C/g, '') // 빌라

  return raw.length >= 2 ? raw : null
}

export function propertyDuplicateKey(row: DuplicateCandidateProperty): string | null {
  const unit = extractUnit([row.unit_number, row.road_address].filter(Boolean).join(' '))
  const building = buildingPart(row)
  if (!unit || !building) return null
  return `${building}|${unit}`
}

export function findDuplicatePropertyIds(rows: DuplicateCandidateProperty[]): Set<string> {
  const groups = new Map<string, string[]>()

  rows.forEach((row) => {
    const key = propertyDuplicateKey(row)
    if (!key) return
    groups.set(key, [...(groups.get(key) ?? []), row.id])
  })

  const duplicateIds = new Set<string>()
  groups.forEach((ids) => {
    if (ids.length < 2) return
    ids.forEach((id) => duplicateIds.add(id))
  })
  return duplicateIds
}
