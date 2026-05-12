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

  // 브라우저(클라이언트)에서 호출 시 → 서버사이드 프록시 경유
  // JUSO_API_KEY는 서버 전용 환경변수이므로 브라우저에서 직접 접근 불가
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/juso?q=${encodeURIComponent(query)}`)
    if (!res.ok) return []
    return res.json() as Promise<JusoResult[]>
  }

  // 서버사이드 직접 호출
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

  // Juso API는 서버 사이드 fetch에서 Referer 헤더가 없으면 E0001(승인되지 않은 KEY) 반환
  // URL 제한 등록 시 설정한 Referer를 명시적으로 추가
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(
    `https://www.juso.go.kr/addrlink/addrLinkApi.do?${params}`,
    {
      headers: {
        Referer: appUrl,
        Origin:  appUrl,
      },
    },
  )

  if (!res.ok) {
    throw new Error(`[juso] API 오류: ${res.status}`)
  }

  const json = await res.json()
  const errorCode = json?.results?.common?.errorCode
  if (errorCode && errorCode !== '0') {
    console.warn(`[juso] API 오류 코드: ${errorCode} — ${json?.results?.common?.errorMessage}`)
    return []
  }

  return (json?.results?.juso ?? []) as JusoResult[]
}
