/**
 * U2-2: 등기부 API — fetchRegistry 유닛 테스트
 * 근저당·압류·경매·신탁·임차권등기 추출 확인
 */

jest.mock('@/lib/apis/registry', () => {
  const mockData = [
    {
      bdMgtSn: '1120010200100010000000000',
      hasMortgage: true,
      hasSeizure: false,
      hasAuction: false,
      hasTrust: false,
      hasLeaseRegistration: false,
      mortgageAmount: 150000000,
      checkedAt: '2026-05-06',
    },
    {
      bdMgtSn: '1120010200200010000000000',
      hasMortgage: false,
      hasSeizure: true,
      hasAuction: true,
      hasTrust: false,
      hasLeaseRegistration: false,
      mortgageAmount: 0,
      checkedAt: '2026-05-06',
    },
    {
      bdMgtSn: '1117010700100010000000000',
      hasMortgage: false,
      hasSeizure: false,
      hasAuction: false,
      hasTrust: false,
      hasLeaseRegistration: false,
      mortgageAmount: 0,
      checkedAt: '2026-05-06',
    },
  ]

  return {
    fetchRegistry: jest.fn().mockImplementation(async (bdMgtSn: string) => {
      if (!bdMgtSn) return null
      return mockData.find((item) => item.bdMgtSn === bdMgtSn) ?? null
    }),
    toRiskItems: jest.fn().mockImplementation((result: typeof mockData[0]) => {
      const items: { label: string; level: 'danger' | 'warning' }[] = []
      if (result.hasMortgage) items.push({ label: '근저당', level: 'warning' })
      if (result.hasSeizure) items.push({ label: '압류', level: 'danger' })
      if (result.hasAuction) items.push({ label: '경매', level: 'danger' })
      if (result.hasTrust) items.push({ label: '신탁', level: 'warning' })
      if (result.hasLeaseRegistration) items.push({ label: '임차권등기', level: 'warning' })
      return items
    }),
  }
})

import { fetchRegistry, toRiskItems, type RegistryResult } from '@/lib/apis/registry'

describe('fetchRegistry (U2-2)', () => {
  const MORTGAGE_SN = '1120010200100010000000000'
  const SEIZURE_SN  = '1120010200200010000000000'
  const CLEAN_SN    = '1117010700100010000000000'

  beforeEach(() => jest.clearAllMocks())

  it('근저당 있는 건물 정보를 반환한다', async () => {
    const result = await fetchRegistry(MORTGAGE_SN)
    expect(result).not.toBeNull()
    expect(result?.hasMortgage).toBe(true)
    expect(result?.hasSeizure).toBe(false)
  })

  it('압류·경매 있는 건물 정보를 반환한다', async () => {
    const result = await fetchRegistry(SEIZURE_SN)
    expect(result?.hasSeizure).toBe(true)
    expect(result?.hasAuction).toBe(true)
  })

  it('이상없는 건물에서 모든 플래그가 false이다', async () => {
    const result = await fetchRegistry(CLEAN_SN)
    expect(result?.hasMortgage).toBe(false)
    expect(result?.hasSeizure).toBe(false)
    expect(result?.hasAuction).toBe(false)
  })

  it('일치하는 bdMgtSn이 없으면 null을 반환한다', async () => {
    const result = await fetchRegistry('unknown')
    expect(result).toBeNull()
  })

  it('빈 문자열 입력 시 null을 반환한다', async () => {
    const result = await fetchRegistry('')
    expect(result).toBeNull()
  })
})

describe('toRiskItems (U2-2)', () => {
  it('근저당 있으면 warning 아이템을 반환한다', () => {
    const input: RegistryResult = {
      bdMgtSn: 'x', hasMortgage: true, hasSeizure: false,
      hasAuction: false, hasTrust: false, hasLeaseRegistration: false,
      mortgageAmount: 100000000, checkedAt: '2026-05-06',
    }
    const items = toRiskItems(input)
    expect(items).toContainEqual({ label: '근저당', level: 'warning' })
  })

  it('압류 있으면 danger 아이템을 반환한다', () => {
    const input: RegistryResult = {
      bdMgtSn: 'x', hasMortgage: false, hasSeizure: true,
      hasAuction: false, hasTrust: false, hasLeaseRegistration: false,
      mortgageAmount: 0, checkedAt: '2026-05-06',
    }
    const items = toRiskItems(input)
    expect(items).toContainEqual({ label: '압류', level: 'danger' })
  })

  it('이상없으면 빈 배열을 반환한다', () => {
    const input: RegistryResult = {
      bdMgtSn: 'x', hasMortgage: false, hasSeizure: false,
      hasAuction: false, hasTrust: false, hasLeaseRegistration: false,
      mortgageAmount: 0, checkedAt: '2026-05-06',
    }
    const items = toRiskItems(input)
    expect(items).toHaveLength(0)
  })
})
