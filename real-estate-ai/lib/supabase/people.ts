/**
 * Supabase people CRUD
 * U3-5 — 인물 등록 + 동명인 감지
 * Phase 2 확장: display_name, address, notes, is_corporate
 */
import { createBrowserSupabaseClient } from './client'
import { ensureCurrentUser } from './ensureUser'

// ─── 타입 ────────────────────────────────────────────────
export interface PersonRow {
  id: string
  name: string
  phone: string | null
  role: string | null
  carrier?: string | null
  carrier_note?: string | null
  /** migration 010 이후 컬럼 */
  display_name?: string | null
  address?: string | null
  notes?: string | null
  is_corporate?: boolean
  owned_property_count?: number
  handling_property_count?: number
  warning: boolean
  created_at: string
}

export interface SavePersonPayload {
  name: string
  phone?: string
  role?: string
  carrier?: string
  carrier_note?: string
  /** migration 010 이후 필드 */
  display_name?: string
  address?: string
  notes?: string
  is_corporate?: boolean
}

const SELECT_COLS = 'id, name, phone, role, carrier, carrier_note, display_name, address, notes, is_corporate, warning, created_at'
const COUNT_CHUNK_SIZE = 200

interface OwnershipCountRow {
  person_id: string
  properties?: {
    road_address: string | null
    building_dong: string | null
    unit_number: string | null
  } | null
}

function ownershipUnitKey(row: OwnershipCountRow): string {
  const property = row.properties
  if (!property) return ''
  return [
    property.road_address?.trim() ?? '',
    property.building_dong?.trim() ?? '',
    property.unit_number?.trim() ?? '',
  ].join('|')
}

async function selectRowsByChunks<T>(
  supabase: ReturnType<typeof createBrowserSupabaseClient>,
  table: string,
  select: string,
  column: string,
  ids: string[],
): Promise<T[]> {
  const rows: T[] = []
  for (let index = 0; index < ids.length; index += COUNT_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + COUNT_CHUNK_SIZE)
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .in(column, chunk)
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
  }
  return rows
}

// ─── 저장 ────────────────────────────────────────────────
export async function savePerson(payload: SavePersonPayload): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('people')
    .insert({
      name:         payload.name,
      phone:        payload.phone        ?? null,
      role:         payload.role         ?? null,
      carrier:      payload.carrier      ?? null,
      carrier_note: payload.carrier_note ?? null,
      display_name: payload.display_name ?? null,
      address:      payload.address      ?? null,
      notes:        payload.notes        ?? null,
      is_corporate: payload.is_corporate ?? false,
      warning:      false,
    })
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

// ─── 목록 조회 ────────────────────────────────────────────
export async function listPeople(): Promise<PersonRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('people')
    .select(SELECT_COLS)
    .order('created_at', { ascending: false })

  if (error) throw error
  const people = (data ?? []) as PersonRow[]
  if (people.length === 0) return people

  const ids = people.map((person) => person.id)
  const ownershipRows = await selectRowsByChunks<OwnershipCountRow>(
    supabase,
    'co_ownership',
    'person_id, properties(road_address, building_dong, unit_number)',
    'person_id',
    ids,
  )
  const handlingRows = await selectRowsByChunks<{ handling_person_id: string | null }>(
    supabase,
    'properties',
    'handling_person_id',
    'handling_person_id',
    ids,
  )

  const ownerUnits = new Map<string, Set<string>>()
  for (const row of ownershipRows) {
    const key = ownershipUnitKey(row)
    if (!key) continue
    const set = ownerUnits.get(row.person_id) ?? new Set<string>()
    set.add(key)
    ownerUnits.set(row.person_id, set)
  }

  const handlingCounts = new Map<string, number>()
  for (const row of handlingRows) {
    if (!row.handling_person_id) continue
    handlingCounts.set(row.handling_person_id, (handlingCounts.get(row.handling_person_id) ?? 0) + 1)
  }

  return people.map((person) => ({
    ...person,
    is_corporate:            person.is_corporate    ?? false,
    owned_property_count:    ownerUnits.get(person.id)?.size ?? 0,
    handling_property_count: handlingCounts.get(person.id) ?? 0,
  }))
}

// ─── 동명인 검색 ──────────────────────────────────────────
export async function searchPeopleByName(name: string): Promise<PersonRow[]> {
  if (!name.trim()) return []
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('people')
    .select('id, name, phone, role, display_name, is_corporate, warning, created_at')
    .or(`name.ilike.%${name.trim()}%,display_name.ilike.%${name.trim()}%`)
    .limit(10)

  if (error) throw error
  return (data ?? []) as PersonRow[]
}

// ─── 단건 조회 ───────────────────────────────────────────
export async function getPerson(id: string): Promise<PersonRow | null> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('people')
    .select(SELECT_COLS)
    .eq('id', id)
    .single()

  if (error) return null
  const p = data as PersonRow
  return { ...p, is_corporate: p.is_corporate ?? false }
}

// ─── 역할 이력 ────────────────────────────────────────────
export interface RelationRow {
  id: string
  role: string
  started_at: string | null
  ended_at: string | null
  property: {
    id: string
    road_address: string
    handling_name: string | null
    neighborhood: string | null
    alias: string | null
    deal_type: string | null
    price_text: string | null
    area_text: string | null
  } | null
}

export interface OwnedPropertyListing {
  id: string
  road_address: string
  handling_name: string | null
  neighborhood: string | null
  alias: string | null
  building_dong: string | null
  unit_number: string | null
  deal_type: string | null
  price_text: string | null
  area_text: string | null
}

export interface OwnedPropertyGroup {
  unit_key: string
  road_address: string
  building_dong: string | null
  unit_number: string | null
  share_ratio: string | null
  is_primary: boolean
  listings: OwnedPropertyListing[]
}

export async function getPersonRelations(personId: string): Promise<RelationRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('relations')
    .select('id, role, started_at, ended_at, properties(id, road_address, handling_name, neighborhood, alias, deal_type, price_text, area_text)')
    .eq('person_id', personId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as unknown[]).map((r: unknown) => {
    const row = r as Record<string, unknown>
    const props = row['properties'] as RelationRow['property']
    return {
      id:         row['id'] as string,
      role:       row['role'] as string,
      started_at: row['started_at'] as string | null,
      ended_at:   row['ended_at'] as string | null,
      property:   props,
    }
  })
}

function propertyUnitKey(property: Pick<OwnedPropertyListing, 'road_address' | 'building_dong' | 'unit_number'>): string {
  return [
    property.road_address?.trim() ?? '',
    property.building_dong?.trim() ?? '',
    property.unit_number?.trim() ?? '',
  ].join('|')
}

export async function getPersonOwnedPropertyGroups(personId: string): Promise<OwnedPropertyGroup[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('co_ownership')
    .select('share_ratio, is_primary, properties(id, road_address, handling_name, neighborhood, alias, building_dong, unit_number, deal_type, price_text, area_text)')
    .eq('person_id', personId)

  if (error) throw error

  const groups = new Map<string, OwnedPropertyGroup>()
  for (const row of (data ?? []) as unknown[]) {
    const record = row as Record<string, unknown>
    const property = record['properties'] as OwnedPropertyListing | null
    if (!property) continue

    const key = propertyUnitKey(property)
    const existing = groups.get(key)
    if (existing) {
      existing.listings.push(property)
      continue
    }

    groups.set(key, {
      unit_key: key,
      road_address: property.road_address,
      building_dong: property.building_dong,
      unit_number: property.unit_number,
      share_ratio: record['share_ratio'] as string | null,
      is_primary: Boolean(record['is_primary']),
      listings: [property],
    })
  }

  return Array.from(groups.values())
}

// ─── 메모 ────────────────────────────────────────────────
export interface MemoRow {
  id: string
  content: string
  type: 'normal' | 'warning' | 'dispute'
  created_at: string
}

export async function getPersonMemos(personId: string): Promise<MemoRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('memos')
    .select('id, content, type, created_at')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MemoRow[]
}

export async function addPersonMemo(
  personId: string,
  payload: { content: string; type?: 'normal' | 'warning' | 'dispute' }
): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const memoType = payload.type ?? 'normal'

  const userId = await ensureCurrentUser(supabase)

  const { data, error } = await supabase
    .from('memos')
    .insert({
      person_id:  personId,
      content:    payload.content,
      type:       memoType,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) throw error

  // warning/dispute 메모 저장 시 → 인물 경고 플래그 자동 활성화
  if (memoType === 'warning' || memoType === 'dispute') {
    await supabase.from('people').update({ warning: true }).eq('id', personId)
  }

  return data as { id: string }
}

export async function deletePersonMemo(memoId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', memoId)

  if (error) throw error
}

// ─── 전화번호 중복 검색 ───────────────────────────────────
export async function searchPeopleByPhone(phone: string): Promise<PersonRow[]> {
  const trimmed = phone.trim()
  if (trimmed.replace(/\D/g, '').length < 9) return []
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('people')
    .select('id, name, phone, role, display_name, is_corporate, warning, created_at')
    .eq('phone', trimmed)
    .limit(5)

  if (error) throw error
  return (data ?? []) as PersonRow[]
}

export async function updatePerson(
  id: string,
  payload: Partial<SavePersonPayload>
): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('people')
    .update(payload)
    .eq('id', id)

  if (error) throw error
}

export async function deletePerson(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id)

  if (error) throw error
}
