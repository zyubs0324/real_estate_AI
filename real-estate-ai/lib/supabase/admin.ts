/**
 * Supabase admin CRUD
 * U3-12 — 관리자 설정 (구성원 관리 + 알림 설정)
 */
import { createBrowserSupabaseClient } from './client'

// ─── 타입 ────────────────────────────────────────────────
export type UserRole = 'admin' | 'member' | 'assistant'

export interface UserSettings {
  lease_countdown_days?:                  number
  auto_priority_enabled?:                 boolean
  auto_priority_days?:                    number
  external_notify_default?:               boolean
  notify_deadline_enabled?:               boolean
  notify_schedule_enabled?:               boolean
  notify_regulation_change_enabled?:      boolean
  notify_diagnosis_change_enabled?:       boolean
  notify_maintenance_recovery_enabled?:   boolean
  notify_maintenance_recovery_days?:      number
  notify_commission_unpaid_enabled?:      boolean
  notify_commission_unpaid_days?:         number
  [key: string]: unknown
}

export interface UserRow {
  id:         string
  name:       string
  email:      string
  role:       UserRole
  is_admin:   boolean
  settings:   UserSettings
  created_at: string
}

// ─── 현재 로그인 유저 ─────────────────────────────────────
export async function getCurrentUser(): Promise<UserRow | null> {
  const supabase = createBrowserSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, is_admin, settings, created_at')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data as UserRow
}

// ─── 구성원 목록 ─────────────────────────────────────────
export async function listUsers(): Promise<UserRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, is_admin, settings, created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as UserRow[]
}

// ─── 역할 변경 ───────────────────────────────────────────
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const isAdmin  = role === 'admin'
  const { error } = await supabase
    .from('users')
    .update({ role, is_admin: isAdmin })
    .eq('id', userId)

  if (error) throw error
}

// ─── 내 알림 설정 업데이트 ───────────────────────────────
export async function updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  // 기존 settings JSONB와 병합
  const { error } = await supabase.rpc('merge_user_settings', {
    uid:  user.id,
    patch: settings,
  })

  // rpc가 없으면 직접 update
  if (error) {
    const { data: current } = await supabase
      .from('users')
      .select('settings')
      .eq('id', user.id)
      .single()

    const merged = { ...((current?.settings as UserSettings) ?? {}), ...settings }
    const { error: updateErr } = await supabase
      .from('users')
      .update({ settings: merged })
      .eq('id', user.id)

    if (updateErr) throw updateErr
  }
}
