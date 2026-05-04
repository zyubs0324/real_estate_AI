/**
 * Supabase 환경변수 검증
 * 앱 시작 시 또는 클라이언트 생성 전에 호출하여 빠른 실패(fast-fail)
 */

export function validateSupabaseEnv(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다.\n' +
      '.env.local 파일에 NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co 를 추가하세요.',
    )
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.\n' +
      '.env.local 파일에 NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> 를 추가하세요.',
    )
  }
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
