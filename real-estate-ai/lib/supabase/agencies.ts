/**
 * Supabase agencies CRUD
 * U3-10 — 타부동산 관리
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
  created_at:      string
}

export interface SaveAgencyPayload {
  name:            string
  representative?: string
  phone?:          string
  address?:        string
  license_no?:     string
  notes?:          string
}

// ─── 목록 조회 ───────────────────────────────────────────
export async function listAgencies(): Promise<AgencyRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, representative, phone, address, license_no, notes, warning, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AgencyRow[]
}

// ─── 단건 조회 ───────────────────────────────────────────
export async function getAgency(id: string): Promise<AgencyRow | null> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, representative, phone, address, license_no, notes, warning, created_at')
    .eq('id', id)
    .single()

  if (error) return null
  return data as AgencyRow
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

  // warning/dispute 메모 저장 시 → 타부동산 경고 플래그 자동 활성화
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
    })
    .eq('id', id)

  if (error) throw error
}
