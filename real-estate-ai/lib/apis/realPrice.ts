/**
 * 국토교통부 실거래가 API
 * Mock 모드: NEXT_PUBLIC_USE_MOCK_API=true → __mocks__/realPrice.json 반환
 * 실제 모드: DATA_GO_KR_API_KEY 필요 (building API와 동일 키)
 */

export interface RealPriceDeal {
  dealYear: number
  dealMonth: number
  dealDay: number
  apartName: string
  area: number          // 전용면적 (㎡)
  floor: number
  dealAmount: number    // 거래금액 (원)
  dealType: string      // 매매 | 전세 | 월세
}

interface MockEntry {
  bdMgtSn: string
  deals: RealPriceDeal[]
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'

export async function fetchRealPrice(bdMgtSn: string): Promise<RealPriceDeal[]> {
  if (!bdMgtSn) return []

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/realPrice.json')
    const entries = mockData.default as MockEntry[]
    return entries.find((e) => e.bdMgtSn === bdMgtSn)?.deals ?? []
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) {
    console.warn('[realPrice] DATA_GO_KR_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/realPrice.json')
    const entries = mockData.default as MockEntry[]
    return entries.find((e) => e.bdMgtSn === bdMgtSn)?.deals ?? []
  }

  // ============================================================
  // [DEFERRED] 국토교통부 실거래가 실제 API 연동
  // Phase: 2 (DATA_GO_KR_API_KEY 설정 후 활성화)
  // API: https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev
  // ============================================================
  return []
}
