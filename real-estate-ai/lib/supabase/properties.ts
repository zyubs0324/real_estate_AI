/**
 * Supabase properties CRUD
 * apple.md §14 — 매물 데이터 레이어
 * Phase 2 확장: PhotoMeta, migration 008 컬럼, ListFilter 확장
 */
import { createBrowserSupabaseClient } from './client'
import { ensureCurrentUser } from './ensureUser'

// ─── 사진 메타데이터 ─────────────────────────────────────
// 구조는 lib/supabase/propertyPhotos.ts의 PhotoMeta와 동일 (구조적 호환)
export interface PhotoMeta {
  path: string
  thumbnail_path: string
  caption: string
  sort_order: number
  source: string
  original_filename: string
  original_size: number
  compressed_size: number
  width: number
  height: number
  content_type: string
  uploaded_by: string
  uploaded_at: string
}

export interface PropertyOwnerSummary {
  person_id?: string | null
  people?: {
    name: string | null
    phone: string | null
    carrier?: string | null
    carrier_note?: string | null
  } | null
}

// ─── 타입 ────────────────────────────────────────────────
export interface PropertyRow {
  id: string
  road_address: string
  jibun_address: string | null
  building_name: string | null
  building_dong: string | null
  unit_number: string | null
  building_type: string | null
  deal_type: string | null
  status: string
  is_our_property: boolean
  is_watchlist: boolean
  is_priority: boolean
  /** migration 008 이후 컬럼 */
  is_exclusive: boolean
  is_strategic: boolean
  handling_agency_id: string | null
  handling_person_id: string | null
  handling_name: string | null
  neighborhood: string | null
  category: string | null
  alias: string | null
  ad_level: string | null
  price_text: string | null
  price_sale: number | null
  price_deposit: number | null
  price_monthly: number | null
  area_text: string | null
  area_exclusive: number | null
  area_supply: number | null
  area_pyeong: number | null
  move_in_date: string | null
  direction: string | null
  maintenance_fee: string | null
  notes: string | null
  floor_info: string | null
  total_floors: number | null
  photo_urls: PhotoMeta[]
  description: string | null
  source_platform: 'direct' | 'naver' | 'zigbang' | 'peterpan' | 'dabang' | 'sheet' | null
  source_url: string | null
  warning: boolean
  registered_date: string | null
  hanjari_date: string | null
  deohill_date: string | null
  co_ownership?: PropertyOwnerSummary[]
  created_at: string
}

export interface SavePropertyPayload {
  road_address: string
  jibun_address?: string
  building_name?: string
  building_dong?: string
  unit_number?: string
  building_type?: string
  deal_type?: string
  status?: string
  is_our_property?: boolean
  /** migration 008 이후 필드 */
  is_exclusive?: boolean
  is_strategic?: boolean
  handling_agency_id?: string | null
  handling_person_id?: string | null
  handling_name?: string
  neighborhood?: string
  category?: string
  alias?: string
  ad_level?: string
  price_text?: string
  price_sale?: number | null
  price_deposit?: number | null
  price_monthly?: number | null
  area_text?: string
  area_exclusive?: number | null
  area_supply?: number | null
  area_pyeong?: number | null
  move_in_date?: string | null
  direction?: string | null
  maintenance_fee?: string
  notes?: string
  floor_info?: string
  total_floors?: number | null
  description?: string
  source_platform?: PropertyRow['source_platform']
  source_url?: string
  registered_date?: string | null
  hanjari_date?: string | null
  deohill_date?: string | null
}

// ─── 저장 ────────────────────────────────────────────────
export async function saveProperty(payload: SavePropertyPayload): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('properties')
    .insert({
      road_address:       payload.road_address,
      jibun_address:      payload.jibun_address      ?? null,
      building_name:      payload.building_name      ?? null,
      building_dong:      payload.building_dong      ?? null,
      unit_number:        payload.unit_number        ?? null,
      building_type:      payload.building_type      ?? null,
      deal_type:          payload.deal_type          ?? null,
      status:             payload.status             ?? '공실',
      is_our_property:    payload.is_our_property    ?? true,
      is_exclusive:       payload.is_exclusive       ?? false,
      is_strategic:       payload.is_strategic       ?? false,
      handling_agency_id: payload.handling_agency_id ?? null,
      handling_person_id: payload.handling_person_id ?? null,
      handling_name:      payload.handling_name      ?? null,
      neighborhood:       payload.neighborhood       ?? null,
      category:           payload.category           ?? null,
      alias:              payload.alias              ?? null,
      price_text:         payload.price_text         ?? null,
      area_text:          payload.area_text          ?? null,
      notes:              payload.notes              ?? null,
      description:        payload.description        ?? null,
      source_platform:    payload.source_platform    ?? null,
      source_url:         payload.source_url         ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

// ─── 라벨 업데이트 ───────────────────────────────────────
export interface LabelUpdate {
  is_our_property?: boolean
  is_watchlist?: boolean
  is_priority?: boolean
}

export async function updatePropertyLabels(id: string, labels: LabelUpdate): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('properties')
    .update({ ...labels, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── 목록 조회 ────────────────────────────────────────────
export interface ListFilter {
  tab?: 'all' | 'ours' | 'interest' | 'focus' | 'exclusive' | 'strategic'
  dealType?: string
  handlingPersonId?: string
  ownerPersonId?: string
  /** migration 010 이후 필터 */
  handlingAgencyId?: string
  coBrokerAgencyId?: string
}

const LIST_SELECT = [
  'id', 'road_address', 'jibun_address', 'building_name', 'building_dong', 'unit_number',
  'building_type', 'deal_type', 'status',
  'is_our_property', 'is_watchlist', 'is_priority', 'is_exclusive', 'is_strategic',
  'handling_agency_id', 'handling_person_id', 'handling_name',
  'neighborhood', 'category', 'alias', 'ad_level',
  'price_text', 'price_sale', 'price_deposit', 'price_monthly',
  'area_text', 'area_exclusive', 'area_supply', 'area_pyeong',
  'move_in_date', 'direction', 'maintenance_fee', 'notes',
  'hanjari_date', 'deohill_date',
  'photo_urls', 'source_platform', 'source_url',
  'warning', 'registered_date', 'created_at',
  'co_ownership(person_id, people(name, phone, carrier, carrier_note))',
].join(', ')

export async function listProperties(filter: ListFilter = {}): Promise<PropertyRow[]> {
  const supabase = createBrowserSupabaseClient()

  // ownerPersonId 사전 조회
  let ownerPropertyIds: string[] | null = null
  if (filter.ownerPersonId) {
    const { data, error } = await supabase
      .from('co_ownership')
      .select('property_id')
      .eq('person_id', filter.ownerPersonId)
    if (error) throw error
    ownerPropertyIds = ((data ?? []) as Array<{ property_id: string }>).map((r) => r.property_id)
    if (ownerPropertyIds.length === 0) return []
  }

  // coBrokerAgencyId 사전 조회 (migration 010 이전에는 오류 무시)
  let coBrokerPropertyIds: string[] | null = null
  if (filter.coBrokerAgencyId) {
    try {
      const { data, error } = await supabase
        .from('property_agencies')
        .select('property_id')
        .eq('agency_id', filter.coBrokerAgencyId)
      if (error) throw error
      coBrokerPropertyIds = ((data ?? []) as Array<{ property_id: string }>).map((r) => r.property_id)
      if (coBrokerPropertyIds.length === 0) return []
    } catch {
      // property_agencies 미존재 시 필터 무시
    }
  }

  let query = supabase
    .from('properties')
    .select(LIST_SELECT)
    .order('created_at', { ascending: false })

  if (filter.tab === 'ours')      query = query.eq('is_our_property', true)
  if (filter.tab === 'interest')  query = query.eq('is_watchlist',    true)
  if (filter.tab === 'focus')     query = query.eq('is_priority',     true)
  if (filter.tab === 'exclusive') query = query.eq('is_exclusive',    true)
  if (filter.tab === 'strategic') query = query.eq('is_strategic',    true)
  if (filter.dealType)            query = query.eq('deal_type',           filter.dealType)
  if (filter.handlingPersonId)    query = query.eq('handling_person_id',  filter.handlingPersonId)
  if (filter.handlingAgencyId)    query = query.eq('handling_agency_id',  filter.handlingAgencyId)
  if (ownerPropertyIds)           query = query.in('id', ownerPropertyIds)
  if (coBrokerPropertyIds)        query = query.in('id', coBrokerPropertyIds)

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as unknown as PropertyRow[]).map((p) => ({
    ...p,
    is_exclusive: p.is_exclusive ?? false,
    is_strategic: p.is_strategic ?? false,
    photo_urls:   Array.isArray(p.photo_urls) ? p.photo_urls : [],
    co_ownership: Array.isArray(p.co_ownership) ? p.co_ownership : [],
  }))
}

// ─── 매물 메모 ───────────────────────────────────────────
export interface PropertyMemoRow {
  id:         string
  content:    string
  type:       'normal' | 'warning' | 'dispute'
  created_at: string
}

export async function getPropertyMemos(propertyId: string): Promise<PropertyMemoRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('memos')
    .select('id, content, type, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as PropertyMemoRow[]
}

export async function addPropertyMemo(
  propertyId: string,
  payload: { content: string; type?: 'normal' | 'warning' | 'dispute' }
): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()

  const userId = await ensureCurrentUser(supabase)

  const { data, error } = await supabase
    .from('memos')
    .insert({
      property_id: propertyId,
      content:     payload.content,
      type:        payload.type ?? 'normal',
      created_by:  userId,
    })
    .select('id')
    .single()

  if (error) throw error

  const memoType = payload.type ?? 'normal'
  if (memoType === 'warning' || memoType === 'dispute') {
    await supabase.from('properties').update({ warning: true }).eq('id', propertyId)
  }

  return data as { id: string }
}

export async function deletePropertyMemo(memoId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', memoId)

  if (error) throw error
}

export async function updateProperty(
  id: string,
  payload: Partial<SavePropertyPayload>
): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('properties')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteProperty(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) throw error
}
