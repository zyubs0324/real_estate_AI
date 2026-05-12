/**
 * U1-7: 건축물대장 API — fetchBuilding + buildingQueryFromJuso 유닛 테스트
 */
import type { BuildingQuery } from '@/lib/apis/building'

// fetchBuilding 만 모킹 (buildingQueryFromJuso 실 함수 사용)
jest.mock('@/lib/apis/building', () => {
  // 실 모듈을 가져와 fetchBuilding 만 교체
  const actual = jest.requireActual<typeof import('@/lib/apis/building')>('@/lib/apis/building')
  return {
    ...actual,
    fetchBuilding: jest.fn().mockImplementation(async (query: BuildingQuery) => {
      if (!query?.sigunguCd || !query?.bjdongCd) return null
      return {
        buildingName:     '옥수하이츠',
        mainPurpose:      '공동주택(아파트)',
        totalFloorArea:   12500.5,
        groundFloor:      15,
        undergroundFloor: 2,
        isViolation:      false,
        approvalDate:     '2005-06-30',
        mgmBldrgstPk:     '1120010200100010000000000',
      }
    }),
    fetchBuildingUnits: jest.fn().mockResolvedValue([]),
  }
})

import { fetchBuilding, buildingQueryFromJuso, type BuildingResult } from '@/lib/apis/building'

const MOCK_QUERY: BuildingQuery = {
  sigunguCd: '11200',
  bjdongCd:  '10200',
  bun:       '0001',
  ji:        '0000',
}

// ─── fetchBuilding ─────────────────────────────────────────
describe('fetchBuilding (U1-7)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('BuildingQuery로 건축물 정보를 반환한다', async () => {
    const result = await fetchBuilding(MOCK_QUERY)
    expect(result).not.toBeNull()
    expect(result?.buildingName).toBe('옥수하이츠')
    expect(result?.mainPurpose).toBe('공동주택(아파트)')
    expect(result?.groundFloor).toBe(15)
  })

  it('sigunguCd가 없으면 null을 반환한다', async () => {
    const result = await fetchBuilding({ sigunguCd: '', bjdongCd: '10200' })
    expect(result).toBeNull()
  })

  it('bjdongCd가 없으면 null을 반환한다', async () => {
    const result = await fetchBuilding({ sigunguCd: '11200', bjdongCd: '' })
    expect(result).toBeNull()
  })

  it('BuildingResult 타입 필드를 모두 포함한다', async () => {
    const result = await fetchBuilding(MOCK_QUERY)
    expect(result).toMatchObject<Partial<BuildingResult>>({
      buildingName:     expect.any(String),
      mainPurpose:      expect.any(String),
      totalFloorArea:   expect.any(Number),
      groundFloor:      expect.any(Number),
      undergroundFloor: expect.any(Number),
      isViolation:      expect.any(Boolean),
      approvalDate:     expect.any(String),
    })
  })

  it('위반건축물 여부가 boolean 타입이다', async () => {
    const result = await fetchBuilding(MOCK_QUERY)
    expect(typeof result?.isViolation).toBe('boolean')
  })
})

// ─── buildingQueryFromJuso (실 함수 테스트) ──────────────────
describe('buildingQueryFromJuso (U1-7)', () => {
  // ── bdMgtSn 우선 사용 ────────────────────────────────────
  it('bdMgtSn에서 법정동코드(bjdongCd)를 추출한다 — 한남더힐 케이스', () => {
    // 한남동: 행정동코드(admCd) 끝 5자리 ≠ 법정동코드(bdMgtSn[5:10])
    // bdMgtSn 형식: sigunguCd(5) + bjdongCd(5) + platGbCd(1) + bun(4) + ji(4) + 동코드(6)
    // '1117010700' + '0' + '0001' + '0000' + '000000' = 25자리
    const query = buildingQueryFromJuso({
      admCd:    '1117064000',                    // 행정동: 한남동 (끝 5자리 = "64000")
      bdMgtSn:  '1117010700000010000000000',     // 법정동: 한남동("10700"), platGbCd="0"(대지)
      lnbrMnnm: 1,
      lnbrSlno: 0,
      mtYn:     '0',
    })
    expect(query.sigunguCd).toBe('11170')        // 용산구
    expect(query.bjdongCd).toBe('10700')         // 한남동 법정동코드 ✓
    expect(query.bjdongCd).not.toBe('64000')     // 행정동코드가 사용되지 않음 ✓
    expect(query.platGbCd).toBe('0')             // 대지 (bdMgtSn[10] = '0')
    expect(query.bun).toBe('0001')
    expect(query.ji).toBe('0000')
  })

  it('bdMgtSn의 대지구분코드(platGbCd)를 mtYn보다 우선한다', () => {
    // bdMgtSn[10] = '0' (대지), mtYn = '1' (산) — bdMgtSn 우선
    const query = buildingQueryFromJuso({
      admCd:    '1168010300',
      bdMgtSn:  '1168010300' + '0' + '00120000000000',  // platGbCd = '0'
      lnbrMnnm: 12,
      lnbrSlno: 0,
      mtYn:     '1',   // 산이라고 표시되지만 bdMgtSn 우선
    })
    expect(query.platGbCd).toBe('0')            // bdMgtSn[10] 우선
  })

  // ── admCd 폴백 ───────────────────────────────────────────
  it('bdMgtSn 없으면 admCd에서 sigunguCd/bjdongCd를 분리한다', () => {
    const query = buildingQueryFromJuso({
      admCd:    '1168010300',
      lnbrMnnm: 12,
      lnbrSlno: 0,
      mtYn:     '0',
    })
    expect(query.sigunguCd).toBe('11680')
    expect(query.bjdongCd).toBe('10300')
    expect(query.bun).toBe('0012')
    expect(query.ji).toBe('0000')
    expect(query.platGbCd).toBe('0')
  })

  it('bdMgtSn 없을 때 산(mtYn=1)이면 platGbCd=1이다', () => {
    const query = buildingQueryFromJuso({
      admCd:    '1168010300',
      lnbrMnnm: 1,
      lnbrSlno: 0,
      mtYn:     '1',
    })
    expect(query.platGbCd).toBe('1')
  })

  it('bdMgtSn 길이가 11 미만이면 admCd 폴백을 사용한다', () => {
    const query = buildingQueryFromJuso({
      admCd:    '1168010300',
      bdMgtSn:  '1168010',    // 길이 7 — 짧아서 무효
      lnbrMnnm: 5,
      lnbrSlno: 0,
    })
    expect(query.sigunguCd).toBe('11680')
    expect(query.bjdongCd).toBe('10300')   // admCd 폴백
  })

  it('lnbrMnnm/lnbrSlno를 4자리로 패딩한다', () => {
    const query = buildingQueryFromJuso({ admCd: '1168010300', lnbrMnnm: 3, lnbrSlno: 1 })
    expect(query.bun).toBe('0003')
    expect(query.ji).toBe('0001')
  })
})
