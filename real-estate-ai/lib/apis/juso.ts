/**
 * 도로명주소 API (juso.go.kr)
 * Mock 모드: NEXT_PUBLIC_USE_MOCK_API=true → __mocks__/juso.json 반환
 * 실제 모드: JUSO_API_KEY 필요
 */

export interface JusoResult {
  roadAddr: string       // 도로명주소 전체
  roadAddrPart1: string  // 도로명주소 (건물번호 포함)
  jibunAddr: string      // 지번주소
  zipNo: string          // 우편번호
  admCd: string          // 행정구역코드
  rnMgtSn: string        // 도로명코드
  bdMgtSn: string        // 건물관리번호
  detBdNmList: string    // 상세건물명
  bdNm: string           // 건물명
  bdKdcd: string         // 공동주택여부 (1=공동, 0=단독)
  siNm: string           // 시도명
  sggNm: string          // 시군구명
  emdNm: string          // 읍면동명
  liNm: string           // 리명
  rn: string             // 도로명
  udrtYn: string         // 지하여부
  buldMnnm: number       // 건물본번
  buldSlno: number       // 건물부번
  mtYn: string           // 산여부
  lnbrMnnm: number       // 지번본번
  lnbrSlno: number       // 지번부번
  emdNo: string          // 읍면동일련번호
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'
const MIN_QUERY_LENGTH = 2

export async function fetchJuso(query: string): Promise<JusoResult[]> {
  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    return []
  }

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/juso.json')
    const results = mockData.default as JusoResult[]
    // 쿼리 포함 여부로 필터링 (실제 API 동작 시뮬레이션)
    return results.filter(
      (item) =>
        item.roadAddr.includes(query) ||
        item.jibunAddr.includes(query) ||
        item.bdNm.includes(query),
    )
  }

  // 실제 API 호출
  const apiKey = process.env.JUSO_API_KEY
  if (!apiKey) {
    console.warn('[juso] JUSO_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/juso.json')
    return mockData.default as JusoResult[]
  }

  const params = new URLSearchParams({
    currentPage: '1',
    countPerPage: '10',
    keyword: query,
    confmKey: apiKey,
    resultType: 'json',
  })

  const res = await fetch(
    `https://www.juso.go.kr/addrlink/addrLinkApi.do?${params}`,
  )

  if (!res.ok) {
    throw new Error(`[juso] API 오류: ${res.status}`)
  }

  const json = await res.json()
  return (json?.results?.juso ?? []) as JusoResult[]
}
