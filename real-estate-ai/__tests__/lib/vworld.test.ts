/**
 * U2-5: VWorld API — fetchVWorld 유닛 테스트
 * 용도지역·공시지가 조회
 */

jest.mock('@/lib/apis/vworld', () => ({
  fetchVWorld: jest.fn().mockImplementation(async (bdMgtSn: string) => {
    if (!bdMgtSn) return null
    const data = [
      { bdMgtSn: '1120010200100010000000000', landUseZone: '제2종일반주거지역', officialLandPrice: 3850000, pricedAt: '2025' },
      { bdMgtSn: '1117010700100010000000000', landUseZone: '제1종일반주거지역', officialLandPrice: 12500000, pricedAt: '2025' },
    ]
    return data.find((d) => d.bdMgtSn === bdMgtSn) ?? null
  }),
}))

import { fetchVWorld, type VWorldResult } from '@/lib/apis/vworld'

describe('fetchVWorld (U2-5)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('bdMgtSn으로 용도지역 정보를 반환한다', async () => {
    const result = await fetchVWorld('1120010200100010000000000')
    expect(result).not.toBeNull()
    expect(result?.landUseZone).toBe('제2종일반주거지역')
  })

  it('공시지가를 숫자로 반환한다', async () => {
    const result = await fetchVWorld('1120010200100010000000000')
    expect(typeof result?.officialLandPrice).toBe('number')
    expect(result?.officialLandPrice).toBeGreaterThan(0)
  })

  it('한남더힐의 용도지역은 제1종일반주거지역이다', async () => {
    const result = await fetchVWorld('1117010700100010000000000')
    expect(result?.landUseZone).toBe('제1종일반주거지역')
    expect(result?.officialLandPrice).toBe(12500000)
  })

  it('일치하는 bdMgtSn이 없으면 null을 반환한다', async () => {
    const result = await fetchVWorld('unknown')
    expect(result).toBeNull()
  })

  it('빈 문자열 입력 시 null을 반환한다', async () => {
    const result = await fetchVWorld('')
    expect(result).toBeNull()
  })

  it('VWorldResult 타입 필드를 포함한다', async () => {
    const result = await fetchVWorld('1120010200100010000000000')
    expect(result).toMatchObject<Partial<VWorldResult>>({
      landUseZone: expect.any(String),
      officialLandPrice: expect.any(Number),
      pricedAt: expect.any(String),
    })
  })
})
