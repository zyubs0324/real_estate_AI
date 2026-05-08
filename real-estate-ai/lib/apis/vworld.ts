/**
 * VWorld API (vworld.kr) — 용도지역·공시지가 조회
 * Mock 모드: NEXT_PUBLIC_USE_MOCK_API=true → __mocks__/vworld.json 반환
 * 실제 모드: VWORLD_API_KEY 필요
 */

export interface VWorldResult {
  bdMgtSn: string
  landUseZone: string         // 용도지역 (제1종일반주거지역, 상업지역 등)
  officialLandPrice: number   // 공시지가 (원/㎡)
  pricedAt: string            // 공시기준년도 (YYYY)
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'

export async function fetchVWorld(bdMgtSn: string): Promise<VWorldResult | null> {
  if (!bdMgtSn) return null

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/vworld.json')
    const results = mockData.default as VWorldResult[]
    return results.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }

  const apiKey = process.env.VWORLD_API_KEY
  if (!apiKey) {
    console.warn('[vworld] VWORLD_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/vworld.json')
    const results = mockData.default as VWorldResult[]
    return results.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }

  // ============================================================
  // [DEFERRED] VWorld 실제 API 연동
  // Phase: 2 (VWORLD_API_KEY 발급 후 활성화)
  // API: https://api.vworld.kr/req/data
  // ============================================================
  return null
}
