/**
 * Supabase Auth Callback Route
 * 이메일 인증, 비밀번호 복구, 매직링크 등 모든 Supabase auth 리다이렉트 처리
 * @supabase/ssr PKCE 플로우: code → session 교환
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'recovery' | 'signup' | 'magiclink'
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const response = NextResponse.redirect(
      type === 'recovery'
        ? new URL('/auth/reset-password', origin)
        : new URL(next, origin),
    )

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }
  }

  // 실패 시 에러 메시지와 함께 로그인 페이지로
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
