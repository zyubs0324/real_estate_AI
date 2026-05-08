/**
 * Supabase properties CRUD
 * apple.md §14 — 매물 데이터 레이어
 */
import { createBrowserSupabaseClient } from './client'
import { ensureCurrentUser } from './ensureUser'

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
  warning: boolean
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
}

// ─── 저장 ────────────────────────────────────────────────
export async function saveProperty(payload: SavePropertyPayload): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('properties')
    .insert({
      road_address:    payload.road_address,
      jibun_address:   payload.jibun_address   ?? null,
      building_name:   payload.building_name   ?? null,
      building_dong:   payload.building_dong   ?? null,
      unit_number:     payload.unit_number     ?? null,
      building_type:   payload.building_type   ?? null,
      deal_type:       payload.deal_type       ?? null,
      status:          payload.status          ?? '공실',
      is_our_property: payload.is_our_property ?? true,
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
  tab?: 'all' | 'ours' | 'interest' | 'focus'
  dealType?: string
}

export async function listProperties(filter: ListFilter = {}): Promise<PropertyRow[]> {
  const supabase = createBrowserSupabaseClient()
  let query = supabase
    .from('properties')
    .select('id, road_address, jibun_address, building_name, building_dong, unit_number, building_type, deal_type, status, is_our_property, is_watchlist, is_priority, warning, created_at')
    .order('created_at', { ascending: false })

  if (filter.tab === 'ours')     query = query.eq('is_our_property', true)
  if (filter.tab === 'interest') query = query.eq('is_watchlist',    true)
  if (filter.tab === 'focus')    query = query.eq('is_priority',     true)
  if (filter.dealType)           query = query.eq('deal_type',       filter.dealType)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PropertyRow[]
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

  // warning/dispute 메모 저장 시 → 매물 경고 플래그 자동 활성화
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
