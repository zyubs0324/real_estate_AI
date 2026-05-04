/**
 * lib/supabase/client.ts & server.ts — 기본 생성 테스트
 * Supabase URL/KEY 미설정 시 경고 로그 확인
 */

// 환경변수 모킹
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Supabase 클라이언트 — 환경변수 검증', () => {
  it('NEXT_PUBLIC_SUPABASE_URL이 없으면 에러를 던진다', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

    await expect(import('@/lib/supabase/config')).resolves.toBeDefined()
    const { validateSupabaseEnv } = await import('@/lib/supabase/config')
    expect(() => validateSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('NEXT_PUBLIC_SUPABASE_ANON_KEY가 없으면 에러를 던진다', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''

    jest.resetModules()
    const { validateSupabaseEnv } = await import('@/lib/supabase/config')
    expect(() => validateSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
  })

  it('두 환경변수가 모두 있으면 에러 없이 통과한다', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    jest.resetModules()
    const { validateSupabaseEnv } = await import('@/lib/supabase/config')
    expect(() => validateSupabaseEnv()).not.toThrow()
  })
})
