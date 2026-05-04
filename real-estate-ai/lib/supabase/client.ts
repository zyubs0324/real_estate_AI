/**
 * 브라우저(클라이언트 컴포넌트) 전용 Supabase 클라이언트
 * @supabase/ssr 사용 — 쿠키 기반 세션 관리
 */
import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

export function createBrowserSupabaseClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
