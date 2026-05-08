/**
 * 부동산중개업 정보 서비스 API
 * U3-10 — 타부동산 자동 조회
 *
 * data.go.kr (국토교통부) — DATA_GO_KR_API_KEY 사용
 * NEXT_PUBLIC_USE_MOCK_API=true → lib/apis/__mocks__/agency.json 반환
 *
 * API 엔드포인트: https://apis.data.go.kr/1741000/busAginfoService1/getBusAgInfoSearch1
 *   - searchGbn: 상호명(1) | 등록번호(2)
 *   - searchWord: 검색어
 */

export interface AgencySearchResult {
  name:           string
  representative: string
  phone:          string
  address:        string
  license_no:     string
}

export interface AgencySearchParams {
  name?:       string   // 상호명 검색어
  license_no?: string   // 등록번호 검색어
}

export async function searchAgency(
  params: AgencySearchParams
): Promise<AgencySearchResult | null> {
  // ─── Mock 모드 ─────────────────────────────────────────
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') {
    const mockData = (await import('./__mocks__/agency.json')).default as AgencySearchResult[]
    const query = (params.name ?? params.license_no ?? '').toLowerCase()
    const found = mockData.find(
      (a) =>
        a.name.includes(query) ||
        a.license_no.includes(query)
    )
    return found ?? null
  }

  // ─── 실제 API ──────────────────────────────────────────
  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) {
    console.warn('[agency] DATA_GO_KR_API_KEY 미설정 — Mock 모드로 fallback')
    return null
  }

  const searchGbn  = params.license_no ? '2' : '1'
  const searchWord = params.license_no ?? params.name ?? ''

  const url = new URL(
    'https://apis.data.go.kr/1741000/busAginfoService1/getBusAgInfoSearch1'
  )
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('searchGbn',  searchGbn)
  url.searchParams.set('searchWord', searchWord)
  url.searchParams.set('numOfRows',  '1')
  url.searchParams.set('pageNo',     '1')
  url.searchParams.set('type',       'json')

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null

    const json = await res.json()
    // 응답 구조: { response: { body: { items: { item: [...] } } } }
    const items = json?.response?.body?.items?.item
    if (!items || items.length === 0) return null

    const item = Array.isArray(items) ? items[0] : items
    return {
      name:           item.cgNm     ?? '',
      representative: item.rprsvNm  ?? '',
      phone:          item.ofcTelno ?? '',
      address:        item.rdnmadr  ?? item.lnmadr ?? '',
      license_no:     item.bsnmCmpnm ?? searchWord,
    }
  } catch {
    return null
  }
}
