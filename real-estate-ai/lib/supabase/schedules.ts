/**
 * Supabase schedules CRUD
 * U3-8 — 일정 등록 + D-1 이메일 알림
 */
import { createBrowserSupabaseClient } from './client'

// ─── 타입 ────────────────────────────────────────────────
export interface ScheduleRow {
  id:            string
  title:         string
  schedule_type: string
  due_date:      string   // ISO 8601
  is_done:       boolean
  memo:          string | null
  created_at:    string
}

export interface SaveSchedulePayload {
  title:         string
  schedule_type: string
  due_date:      string   // ISO 8601 datetime
  memo?:         string
}

// ─── 저장 ────────────────────────────────────────────────
export async function saveSchedule(
  payload: SaveSchedulePayload
): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      title:         payload.title,
      schedule_type: payload.schedule_type,
      due_date:      payload.due_date,
      memo:          payload.memo ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

// ─── 목록 조회 ───────────────────────────────────────────
export async function listSchedules(): Promise<ScheduleRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('schedules')
    .select('id, title, schedule_type, due_date, is_done, memo, created_at')
    .order('due_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as ScheduleRow[]
}
