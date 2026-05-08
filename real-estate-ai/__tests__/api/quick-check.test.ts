/**
 * U3-3: runQuickCheck 로직 테스트
 * /api/quick-check Route의 핵심 비즈니스 로직
 */

jest.mock('@/lib/apis/building', () => ({
  fetchBuilding: jest.fn().mockResolvedValue({
    buildingName: '테스트빌딩', mainPurpose: '공동주택(아파트)',
    totalFloorArea: 5000, groundFloor: 10, undergroundFloor: 1,
    isViolation: false, approvalDate: '2010-01-01',
  }),
}))

jest.mock('@/lib/apis/registry', () => ({
  fetchRegistry: jest.fn().mockResolvedValue({
    hasMortgage: true, hasSeizure: false, hasAuction: false,
    hasTrust: false, hasLeaseRegistration: false, mortgageAmount: 50000000,
  }),
  toRiskItems: jest.fn().mockReturnValue([{ label: '근저당', level: 'warning' }]),
}))

jest.mock('@/lib/regulations', () => ({
  checkRegulations: jest.fn().mockReturnValue({
    isSpeculativeZone: true, isAdjustmentZone: false, isLandTransactionZone: false,
  }),
}))

jest.mock('@/lib/supabase/diagnostics', () => ({
  saveDiagnostics: jest.fn().mockResolvedValue(undefined),
}))

import { runQuickCheck } from '@/lib/quickCheck'
import { saveDiagnostics } from '@/lib/supabase/diagnostics'

const mockSaveDiagnostics = saveDiagnostics as jest.Mock

const INPUT = {
  bdMgtSn:  '1120010200100010000000000',
  roadAddr: '서울특별시 성동구 옥수로 100',
  siNm: '서울특별시', sggNm: '성동구', emdNm: '옥수동',
}

describe('runQuickCheck (U3-3)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('riskItems 배열을 반환한다', async () => {
    const result = await runQuickCheck(INPUT)
    expect(Array.isArray(result.riskItems)).toBe(true)
  })

  it('checkedAt 날짜 문자열을 반환한다', async () => {
    const result = await runQuickCheck(INPUT)
    expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('등기부 위험 태그를 포함한다', async () => {
    const result = await runQuickCheck(INPUT)
    expect(result.riskItems.some((r) => r.label === '근저당')).toBe(true)
  })

  it('규제지역 태그를 포함한다 (투기과열지구)', async () => {
    const result = await runQuickCheck(INPUT)
    expect(result.riskItems.some((r) => r.label === '투기과열지구')).toBe(true)
  })

  it('saveDiagnostics를 호출해 DB에 저장한다', async () => {
    await runQuickCheck(INPUT)
    expect(mockSaveDiagnostics).toHaveBeenCalledTimes(1)
    expect(mockSaveDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ bdMgtSn: INPUT.bdMgtSn })
    )
  })

  it('위반건축물인 경우 danger 태그를 최우선으로 추가한다', async () => {
    const { fetchBuilding } = require('@/lib/apis/building')
    fetchBuilding.mockResolvedValueOnce({
      buildingName: '위반빌딩', isViolation: true,
      totalFloorArea: 100, groundFloor: 2, undergroundFloor: 0, approvalDate: '',
    })
    const result = await runQuickCheck(INPUT)
    expect(result.riskItems[0]).toMatchObject({ label: '위반건축물', level: 'danger' })
  })

  it('건축물/등기 API 오류 시에도 정상 반환한다 (Graceful Degradation)', async () => {
    const { fetchBuilding } = require('@/lib/apis/building')
    fetchBuilding.mockRejectedValueOnce(new Error('API 장애'))
    const { fetchRegistry } = require('@/lib/apis/registry')
    fetchRegistry.mockRejectedValueOnce(new Error('API 장애'))
    // 규제지역은 로컬 데이터 — 항상 실행
    const { checkRegulations } = require('@/lib/regulations')
    checkRegulations.mockReturnValueOnce({
      isSpeculativeZone: false, isAdjustmentZone: false, isLandTransactionZone: false,
    })
    const result = await runQuickCheck(INPUT)
    // API 실패 시 등기·건축물 태그 없음, 규제지역도 없음
    expect(result.riskItems).toEqual([])
    expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
