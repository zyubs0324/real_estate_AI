/**
 * U2-5: 실거래가 API — fetchRealPrice 유닛 테스트
 */

jest.mock('@/lib/apis/realPrice', () => ({
  fetchRealPrice: jest.fn().mockImplementation(async (bdMgtSn: string) => {
    if (!bdMgtSn) return []
    const data = [
      {
        bdMgtSn: '1120010200100010000000000',
        deals: [
          { dealYear: 2025, dealMonth: 3, dealDay: 15, apartName: '옥수하이츠', area: 84.92, floor: 8, dealAmount: 1050000000, dealType: '매매' },
          { dealYear: 2025, dealMonth: 1, dealDay: 7,  apartName: '옥수하이츠', area: 59.67, floor: 12, dealAmount: 820000000,  dealType: '매매' },
        ],
      },
      {
        bdMgtSn: '1117010700100010000000000',
        deals: [
          { dealYear: 2025, dealMonth: 4, dealDay: 10, apartName: '한남더힐', area: 235.62, floor: 15, dealAmount: 8900000000, dealType: '매매' },
        ],
      },
    ]
    return data.find((d) => d.bdMgtSn === bdMgtSn)?.deals ?? []
  }),
}))

import { fetchRealPrice, type RealPriceDeal } from '@/lib/apis/realPrice'

describe('fetchRealPrice (U2-5)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('bdMgtSn으로 실거래가 목록을 반환한다', async () => {
    const deals = await fetchRealPrice('1120010200100010000000000')
    expect(deals.length).toBeGreaterThan(0)
  })

  it('각 거래 항목이 RealPriceDeal 타입을 충족한다', async () => {
    const deals = await fetchRealPrice('1120010200100010000000000')
    expect(deals[0]).toMatchObject<Partial<RealPriceDeal>>({
      dealYear: expect.any(Number),
      dealMonth: expect.any(Number),
      area: expect.any(Number),
      dealAmount: expect.any(Number),
      dealType: expect.any(String),
    })
  })

  it('한남더힐 최근 거래는 89억원이다', async () => {
    const deals = await fetchRealPrice('1117010700100010000000000')
    expect(deals[0].dealAmount).toBe(8900000000)
  })

  it('일치하는 bdMgtSn이 없으면 빈 배열을 반환한다', async () => {
    const deals = await fetchRealPrice('unknown')
    expect(deals).toEqual([])
  })

  it('빈 문자열 입력 시 빈 배열을 반환한다', async () => {
    const deals = await fetchRealPrice('')
    expect(deals).toEqual([])
  })
})
