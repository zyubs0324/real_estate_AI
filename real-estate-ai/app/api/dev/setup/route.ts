/**
 * [DEV ONLY] 개발 환경 초기 계정 생성 라우트
 * production 에서는 동작하지 않음 (NODE_ENV 체크)
 *
 * 사용법: GET http://localhost:3000/api/dev/setup
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const email = 'zyubs0324@gmail.com'
  const password = 'RealEstate2026!'

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    message: '✅ 개발 계정 생성 완료',
    email,
    password,
    userId: data.user?.id,
    confirmed: data.user?.email_confirmed_at ?? '(확인 필요)',
  })
}
