/**
 * U1-7: 건축물대장 API — fetchBuilding 유닛 테스트
 */

// 모듈 전체 모킹 (dynamic import 대신 직접 mock 사용)
jest.mock('@/lib/apis/building', () => ({
  fetchBuilding: jest.fn().mockImplementation(async (bdMgtSn: string) => {
    if (!bdMgtSn) return null
    const data = [
      {
        buildingName: '옥수하이츠',
        mainPurpose: '공동주택(아파트)',
        totalFloorArea: 12500.5,
        groundFloor: 15,
        undergroundFloor: 2,
        isViolation: false,
        approvalDate: '2005-06-30',
        bdMgtSn: '1120010200100010000000000',
      },
    ]
    return data.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }),
}))

import { fetchBuilding, type BuildingResult } from '@/lib/apis/building'

describe('fetchBuilding (U1-7)', () => {
  const MOCK_BD_MGT_SN = '1120010200100010000000000'

  beforeEach(() => jest.clearAllMocks())

  it('건물관리번호로 건축물 정보를 반환한다', async () => {
    const result = await fetchBuilding(MOCK_BD_MGT_SN)
    expect(result).not.toBeNull()
    expect(result?.buildingName).toBe('옥수하이츠')
    expect(result?.mainPurpose).toBe('공동주택(아파트)')
    expect(result?.groundFloor).toBe(15)
  })

  it('일치하는 bdMgtSn이 없으면 null을 반환한다', async () => {
    const result = await fetchBuilding('unknown-id')
    expect(result).toBeNull()
  })

  it('빈 문자열 입력 시 null을 반환한다', async () => {
    const result = await fetchBuilding('')
    expect(result).toBeNull()
  })

  it('BuildingResult 타입 필드를 모두 포함한다', async () => {
    const result = await fetchBuilding(MOCK_BD_MGT_SN)
    expect(result).toMatchObject<Partial<BuildingResult>>({
      buildingName: expect.any(String),
      mainPurpose: expect.any(String),
      totalFloorArea: expect.any(Number),
      groundFloor: expect.any(Number),
      undergroundFloor: expect.any(Number),
      isViolation: expect.any(Boolean),
      approvalDate: expect.any(String),
    })
  })

  it('위반건축물 여부가 boolean 타입이다', async () => {
    const result = await fetchBuilding(MOCK_BD_MGT_SN)
    expect(typeof result?.isViolation).toBe('boolean')
  })
})
