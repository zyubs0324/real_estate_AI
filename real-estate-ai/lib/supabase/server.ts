/**
 * 서버 컴포넌트 / Route Handler / Server Action 전용 Supabase 클라이언트
 * @supabase/ssr 사용 — Next.js cookies() API로 세션 읽기/쓰기
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Component에서 cookie 쓰기는 무시 (미들웨어가 처리)
        }
      },
    },
  })
}
