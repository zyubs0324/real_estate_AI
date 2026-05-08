/**
 * U2-3: 규제지역 판별 — checkRegulations 유닛 테스트
 * 투기과열지구·조정대상지역·토지거래허가구역
 */
import { checkRegulations, type RegulationResult } from '@/lib/regulations'

describe('checkRegulations (U2-3)', () => {
  // 서울 강남구 삼성동 — 세 가지 규제 모두 해당
  it('강남구 삼성동은 투기과열지구·조정대상지역·토지거래허가구역이다', () => {
    const result = checkRegulations('서울특별시', '강남구', '삼성동')
    expect(result.isSpeculativeZone).toBe(true)
    expect(result.isAdjustmentZone).toBe(true)
    expect(result.isLandTransactionZone).toBe(true)
  })

  // 서울 성동구 — 투기과열·조정 해당, 토지거래허가구역은 성수동만
  it('성동구 옥수동은 투기과열지구·조정대상지역이지만 토지거래허가구역은 아니다', () => {
    const result = checkRegulations('서울특별시', '성동구', '옥수동')
    expect(result.isSpeculativeZone).toBe(true)
    expect(result.isAdjustmentZone).toBe(true)
    expect(result.isLandTransactionZone).toBe(false)
  })

  // 서울 성동구 성수동 — 토지거래허가구역
  it('성동구 성수동은 토지거래허가구역이다', () => {
    const result = checkRegulations('서울특별시', '성동구', '성수동')
    expect(result.isLandTransactionZone).toBe(true)
  })

  // 지방 규제 없는 지역
  it('규제 없는 지역은 모든 플래그가 false이다', () => {
    const result = checkRegulations('강원특별자치도', '춘천시', '소양동')
    expect(result.isSpeculativeZone).toBe(false)
    expect(result.isAdjustmentZone).toBe(false)
    expect(result.isLandTransactionZone).toBe(false)
  })

  // 반환 타입 확인
  it('RegulationResult 타입의 객체를 반환한다', () => {
    const result = checkRegulations('서울특별시', '강남구', '역삼동')
    expect(result).toMatchObject<RegulationResult>({
      isSpeculativeZone: expect.any(Boolean),
      isAdjustmentZone: expect.any(Boolean),
      isLandTransactionZone: expect.any(Boolean),
    })
  })

  // 빈 입력
  it('빈 입력에도 오류 없이 false를 반환한다', () => {
    const result = checkRegulations('', '', '')
    expect(result.isSpeculativeZone).toBe(false)
    expect(result.isAdjustmentZone).toBe(false)
    expect(result.isLandTransactionZone).toBe(false)
  })
})
