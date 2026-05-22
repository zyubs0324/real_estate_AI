/**
 * Supabase agencies CRUD
 * U3-10 — 부동산 관리
 * Phase 2 확장: is_our_office, alias, trust_level, tags, 핸들링/공동중개 카운트
 */
import { createBrowserSupabaseClient } from './client'
import { ensureCurrentUser } from './ensureUser'

// ─── 타입 ────────────────────────────────────────────────
export interface AgencyRow {
  id:              string
  name:            string
  representative:  string | null
  phone:           string | null
  address:         string | null
  license_no:      string | null
  notes:           string | null
  warning:         boolean
  /** migration 010 이후 컬럼 */
  is_our_office:   boolean
  alias:           string | null
  trust_level:     string          // '신뢰' | '일반' | '주의', 기본값 '일반'
  tags:            string[]        // JSONB → string[]
  handling_count?: number
  co_broker_count?: number
  handling_property_count?: number
  co_broker_property_count?: number
  created_at:      string
}

export interface SaveAgencyPayload {
  name:            string
  representative?: string
  phone?:          string
  address?:        string
  license_no?:     string
  notes?:          string
  /** migration 010 이후 필드 */
  is_our_office?:  boolean
  alias?:          string
  trust_level?:    string
  tags?:           string[]
}

const SELECT_COLS = 'id, name, representative, phone, address, license_no, notes, warning, is_our_office, alias, trust_level, tags, created_at'

// ─── 목록 조회 ───────────────────────────────────────────
export async function listAgencies(): Promise<AgencyRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('agencies')
    .select(SELECT_COLS)
    .order('created_at', { ascending: false })

  if (error) throw error
  const agencies = (data ?? []) as AgencyRow[]
  if (agencies.length === 0) return agencies

  const normalized = agencies.map((a) => ({
    ...a,
    tags:          Array.isArray(a.tags) ? a.tags : [],
    is_our_office: a.is_our_office ?? false,
    trust_level:   a.trust_level   ?? '일반',
  }))

  const ids = normalized.map((a) => a.id)

  // 핸들링·공동중개 카운트 — migration 010 이전에는 오류 무시
  try {
    const [{ data: handlingRows }, { data: coBrokerRows }] = await Promise.all([
      supabase
        .from('properties')
        .select('handling_agency_id')
        .in('handling_agency_id', ids),
      supabase
        .from('property_agencies')
        .select('agency_id')
        .in('agency_id', ids),
    ])

    const handlingCounts = new Map<string, number>()
    for (const row of (handlingRows ?? []) as Array<{ handling_agency_id: string | null }>) {
      if (!row.handling_agency_id) continue
      handlingCounts.set(
        row.handling_agency_id,
        (handlingCounts.get(row.handling_agency_id) ?? 0) + 1,
      )
    }

    const coBrokerCounts = new Map<string, number>()
    for (const row of (coBrokerRows ?? []) as Array<{ agency_id: string }>) {
      coBrokerCounts.set(row.agency_id, (coBrokerCounts.get(row.agency_id) ?? 0) + 1)
    }

    return normalized.map((agency) => ({
      ...agency,
      handling_count:  handlingCounts.get(agency.id)  ?? 0,
      co_broker_count: coBrokerCounts.get(agency.id)  ?? 0,
      handling_property_count: handlingCounts.get(agency.id) ?? 0,
      co_broker_property_count: coBrokerCounts.get(agency.id) ?? 0,
    }))
  } catch {
    // property_agencies 테이블 미존재 시 카운트 없이 반환
    return normalized
  }
}

// ─── 우리사무소만 조회 ────────────────────────────────────
export async function listOurOffices(): Promise<AgencyRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('agencies')
    .select(SELECT_COLS)
    .eq('is_our_office', true)
    .order('name', { ascending: true })

  if (error) throw error
  return ((data ?? []) as AgencyRow[]).map((a) => ({
    ...a,
    tags:          Array.isArray(a.tags) ? a.tags : [],
    is_our_office: true,
    trust_level:   a.trust_level ?? '일반',
  }))
}

// ─── 검색 ────────────────────────────────────────────────
export async function searchAgencies(q: string): Promise<AgencyRow[]> {
  if (!q.trim()) return []
  const supabase = createBrowserSupabaseClient()
  const term = q.trim()
  const { data, error } = await supabase
    .from('agencies')
    .select(SELECT_COLS)
    .or(
      `name.ilike.%${term}%,alias.ilike.%${term}%,representative.ilike.%${term}%,phone.ilike.%${term}%,address.ilike.%${term}%`,
    )
    .limit(20)

  if (error) throw error
  return ((data ?? []) as AgencyRow[]).map((a) => ({
    ...a,
    tags:          Array.isArray(a.tags) ? a.tags : [],
    is_our_office: a.is_our_office ?? false,
    trust_level:   a.trust_level ?? '일반',
  }))
}

// ─── 단건 조회 ───────────────────────────────────────────
export async function getAgency(id: string): Promise<AgencyRow | null> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('agencies')
    .select(SELECT_COLS)
    .eq('id', id)
    .single()

  if (error) return null
  const a = data as AgencyRow
  return {
    ...a,
    tags:          Array.isArray(a.tags) ? a.tags : [],
    is_our_office: a.is_our_office ?? false,
    trust_level:   a.trust_level   ?? '일반',
  }
}

// ─── 저장 ────────────────────────────────────────────────
export async function saveAgency(
  payload: SaveAgencyPayload
): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('agencies')
    .insert({
      name:           payload.name,
      representative: payload.representative ?? null,
      phone:          payload.phone          ?? null,
      address:        payload.address        ?? null,
      license_no:     payload.license_no     ?? null,
      notes:          payload.notes          ?? null,
      is_our_office:  payload.is_our_office  ?? false,
      alias:          payload.alias          ?? null,
      trust_level:    payload.trust_level    ?? '일반',
      tags:           payload.tags           ?? [],
    })
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

// ─── 메모 ────────────────────────────────────────────────
export interface AgencyMemoRow {
  id:         string
  content:    string
  type:       'normal' | 'warning' | 'dispute'
  created_at: string
}

export async function getAgencyMemos(agencyId: string): Promise<AgencyMemoRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('memos')
    .select('id, content, type, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AgencyMemoRow[]
}

export async function addAgencyMemo(
  agencyId: string,
  payload: { content: string; type?: 'normal' | 'warning' | 'dispute' }
): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const userId = await ensureCurrentUser(supabase)

  const { data, error } = await supabase
    .from('memos')
    .insert({
      agency_id:  agencyId,
      content:    payload.content,
      type:       payload.type ?? 'normal',
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) throw error

  // warning/dispute 메모 저장 시 → 부동산 경고 플래그 자동 활성화
  const memoType = payload.type ?? 'normal'
  if (memoType === 'warning' || memoType === 'dispute') {
    await supabase.from('agencies').update({ warning: true }).eq('id', agencyId)
  }

  return data as { id: string }
}

export async function deleteAgencyMemo(memoId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', memoId)

  if (error) throw error
}

// ─── 수정 ────────────────────────────────────────────────
export async function updateAgency(
  id: string,
  payload: Partial<SaveAgencyPayload>
): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('agencies')
    .update({
      ...(payload.name            !== undefined && { name:           payload.name }),
      ...(payload.representative  !== undefined && { representative: payload.representative }),
      ...(payload.phone           !== undefined && { phone:          payload.phone }),
      ...(payload.address         !== undefined && { address:        payload.address }),
      ...(payload.license_no      !== undefined && { license_no:     payload.license_no }),
      ...(payload.notes           !== undefined && { notes:          payload.notes }),
      ...(payload.is_our_office   !== undefined && { is_our_office:  payload.is_our_office }),
      ...(payload.alias           !== undefined && { alias:          payload.alias }),
      ...(payload.trust_level     !== undefined && { trust_level:    payload.trust_level }),
      ...(payload.tags            !== undefined && { tags:           payload.tags }),
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteAgency(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('agencies')
    .delete()
    .eq('id', id)

  if (error) throw error
}
