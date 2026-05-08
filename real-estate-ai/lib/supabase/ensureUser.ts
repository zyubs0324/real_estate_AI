/**
 * ensureCurrentUser
 * auth.users 에는 있지만 public.users 에 없는 경우(초대 전 가입 등)를
 * 자동으로 생성해 memos.created_by FK 위반을 방지한다.
 */
import { SupabaseClient } from '@supabase/supabase-js'

export async function ensureCurrentUser(
  supabase: SupabaseClient
): Promise<string> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('로그인이 필요합니다')

  // public.users 에 해당 uid 가 이미 있으면 바로 반환
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) return user.id

  // 없으면 upsert (초대 링크 미사용 직접 가입 계정 보호)
  const email = user.email ?? `${user.id}@unknown`
  const name  = (user.user_metadata?.name as string | undefined)
             ?? (user.user_metadata?.full_name as string | undefined)
             ?? email.split('@')[0]

  const { error: upsertErr } = await supabase
    .from('users')
    .upsert({ id: user.id, name, email }, { onConflict: 'id' })

  if (upsertErr) throw upsertErr

  return user.id
}
