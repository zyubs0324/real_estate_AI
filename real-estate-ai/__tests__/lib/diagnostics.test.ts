/**
 * U2-4: property_diagnostics — 저장·조회 함수 테스트
 */

const mockUpsert = jest.fn().mockResolvedValue({ error: null })
const mockSelect = jest.fn().mockReturnValue({
  eq: jest.fn().mockReturnValue({
    order: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'uuid-1',
            bd_mgt_sn: '1120010200100010000000000',
            road_addr: '서울특별시 성동구 옥수동 옥수로 100',
            has_violation: false,
            has_mortgage: true,
            has_seizure: false,
            has_auction: false,
            has_trust: false,
            has_lease_registration: false,
            is_speculative_zone: true,
            is_adjustment_zone: true,
            is_land_transaction_zone: false,
            risk_items: [{ label: '근저당', level: 'warning' }],
            checked_at: '2026-05-06',
          },
        ],
        error: null,
      }),
    }),
  }),
})

jest.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      upsert: mockUpsert,
      select: mockSelect,
    })),
  })),
}))

jest.mock('@/lib/supabase/diagnostics', () => {
  const actual = jest.requireActual('@/lib/supabase/diagnostics')
  return actual
})

import { saveDiagnostics, getLatestDiagnostics, type DiagnosticsPayload } from '@/lib/supabase/diagnostics'

const payload: DiagnosticsPayload = {
  bdMgtSn: '1120010200100010000000000',
  roadAddr: '서울특별시 성동구 옥수동 옥수로 100',
  hasViolation: false,
  hasMortgage: true,
  hasSeizure: false,
  hasAuction: false,
  hasTrust: false,
  hasLeaseRegistration: false,
  isSpeculativeZone: true,
  isAdjustmentZone: true,
  isLandTransactionZone: false,
  riskItems: [{ label: '근저당', level: 'warning' }],
}

describe('saveDiagnostics (U2-4)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('payload를 Supabase에 upsert 호출한다', async () => {
    await saveDiagnostics(payload)
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })

  it('upsert 인자에 bdMgtSn이 포함된다', async () => {
    await saveDiagnostics(payload)
    const callArg = mockUpsert.mock.calls[0][0]
    expect(callArg).toMatchObject({ bd_mgt_sn: '1120010200100010000000000' })
  })

  it('upsert 인자에 risk_items JSON이 포함된다', async () => {
    await saveDiagnostics(payload)
    const callArg = mockUpsert.mock.calls[0][0]
    expect(callArg.risk_items).toEqual([{ label: '근저당', level: 'warning' }])
  })
})

describe('getLatestDiagnostics (U2-4)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('bdMgtSn으로 최신 진단 결과를 조회한다', async () => {
    const result = await getLatestDiagnostics('1120010200100010000000000')
    expect(result).not.toBeNull()
    expect(result?.bd_mgt_sn).toBe('1120010200100010000000000')
  })

  it('hasMortgage 값이 올바르게 반환된다', async () => {
    const result = await getLatestDiagnostics('1120010200100010000000000')
    expect(result?.has_mortgage).toBe(true)
  })
})
