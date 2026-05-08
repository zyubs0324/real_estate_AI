/**
 * U3-8: /api/cron/notify — D-1 이메일 발송 테스트
 * NextRequest 직접 임포트 없이 GET 핸들러 로직만 검증
 */

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email-001' }),
    },
  })),
}))

// next/server를 미리 모킹 — Request 폴리필 불필요
jest.mock('next/server', () => ({
  NextRequest:  jest.fn(),
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json:   async () => body,
    }),
  },
}))

import { GET } from '@/app/api/cron/notify/route'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowStr = tomorrow.toISOString().split('T')[0]

// GET에 넘길 최소한의 mock request
const mockReq = {} as Parameters<typeof GET>[0]

function makeChain(rows: unknown[]) {
  const lt     = jest.fn().mockResolvedValue({ data: rows, error: null })
  const gte    = jest.fn().mockReturnValue({ lt })
  const eq     = jest.fn().mockReturnValue({ gte })
  const select = jest.fn().mockReturnValue({ eq })
  const from   = jest.fn().mockReturnValue({ select })
  return { from, select, eq, gte, lt }
}

describe('GET /api/cron/notify (U3-8)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('내일 일정이 없으면 sent: 0 반환', async () => {
    const chain = makeChain([])
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(chain)

    const res  = await GET(mockReq)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sent).toBe(0)
  })

  it('내일 일정이 있으면 이메일 발송 후 sent: N 반환', async () => {
    const chain = makeChain([
      {
        id:            'sched-001',
        title:         '잔금 처리',
        schedule_type: '잔금',
        due_date:      `${tomorrowStr}T10:00:00Z`,
        memo:          null,
      },
    ])
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(chain)

    // RESEND_API_KEY를 설정하여 실제 발송 경로 진입
    process.env.RESEND_API_KEY = 'test-key'
    const res  = await GET(mockReq)
    const body = await res.json()
    delete process.env.RESEND_API_KEY

    expect(res.status).toBe(200)
    expect(body.sent).toBe(1)
  })

  it('RESEND_API_KEY 없으면 simulation 모드로 반환', async () => {
    const chain = makeChain([
      {
        id:            'sched-002',
        title:         '계약 체결',
        schedule_type: '계약',
        due_date:      `${tomorrowStr}T14:00:00Z`,
        memo:          '서류 지참 필요',
      },
    ])
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue(chain)

    delete process.env.RESEND_API_KEY
    const res  = await GET(mockReq)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.mode).toBe('simulation')
    expect(body.sent).toBe(1)
  })
})
