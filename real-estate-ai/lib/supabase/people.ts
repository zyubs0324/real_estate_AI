/**
 * Supabase people CRUD
 * U3-5 — 인물 등록 + 동명인 감지
 */
import { createBrowserSupabaseClient } from './client'
import { ensureCurrentUser } from './ensureUser'

// ─── 타입 ────────────────────────────────────────────────
export interface PersonRow {
  id: string
  name: string
  phone: string | null
  role: string | null
  warning: boolean
  created_at: string
}

export interface SavePersonPayload {
  name: string
  phone?: string
  role?: string
}

// ─── 저장 ────────────────────────────────────────────────
export async function savePerson(payload: SavePersonPayload): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('people')
    .insert({
      name:    payload.name,
      phone:   payload.phone  ?? null,
      role:    payload.role   ?? null,
      warning: false,
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
    .select('id, name, phone, role, warning, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as PersonRow[]
}

// ─── 동명인 검색 ──────────────────────────────────────────
export async function searchPeopleByName(name: string): Promise<PersonRow[]> {
  if (!name.trim()) return []
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('people')
    .select('id, name, phone, role, warning, created_at')
    .ilike('name', `%${name.trim()}%`)
    .limit(10)

  if (error) throw error
  return (data ?? []) as PersonRow[]
}

// ─── 단건 조회 ───────────────────────────────────────────
export async function getPerson(id: string): Promise<PersonRow | null> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('people')
    .select('id, name, phone, role, warning, created_at')
    .eq('id', id)
    .single()

  if (error) return null
  return data as PersonRow
}

// ─── 역할 이력 ────────────────────────────────────────────
export interface RelationRow {
  id: string
  role: string
  started_at: string | null
  ended_at: string | null
  property: { road_address: string } | null
}

export async function getPersonRelations(personId: string): Promise<RelationRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('relations')
    .select('id, role, started_at, ended_at, properties(road_address)')
    .eq('person_id', personId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as unknown[]).map((r: unknown) => {
    const row = r as Record<string, unknown>
    const props = row['properties'] as { road_address: string } | null
    return {
      id:         row['id'] as string,
      role:       row['role'] as string,
      started_at: row['started_at'] as string | null,
      ended_at:   row['ended_at'] as string | null,
      property:   props ? { road_address: props.road_address } : null,
    }
  })
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
    await supabase
      .from('people')
      .update({ warning: true })
      .eq('id', personId)
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
  // 숫자만 추출 후 최소 9자리 이상이어야 검색
  if (trimmed.replace(/\D/g, '').length < 9) return []
  const supabase = createBrowserSupabaseClient()
  // 입력값 그대로 정확히 일치하는 번호 검색 (하이픈 포함 동일 형식)
  const { data, error } = await supabase
    .from('people')
    .select('id, name, phone, role, warning, created_at')
    .eq('phone', trimmed)
    .limit(5)

  if (error) throw error
  return (data ?? []) as PersonRow[]
}
