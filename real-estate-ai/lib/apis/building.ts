/**
 * 건축물대장 API (data.go.kr)
 * Mock 모드: NEXT_PUBLIC_USE_MOCK_API=true → __mocks__/building.json 반환
 * 실제 모드: DATA_GO_KR_API_KEY 필요
 *
 * 사용 엔드포인트:
 *   getBrTitleInfo        — 건축물대장 표제부 (건물 기본 정보)
 *   getBrExposPubuseAreaInfo — 전유부 면적 (호별 목록)
 */

// ─── 타입 ─────────────────────────────────────────────────

export interface BuildingResult {
  buildingName: string      // 건물명
  mainPurpose: string       // 주용도 (API 원문 그대로)
  totalFloorArea: number    // 연면적 (㎡)
  groundFloor: number       // 지상층수
  undergroundFloor: number  // 지하층수
  isViolation: boolean      // 위반건축물 여부
  approvalDate: string      // 사용승인일 (YYYY-MM-DD)
  bdMgtSn: string           // 건물관리번호
}

export interface BuildingUnit {
  flrNo: string   // 층 번호 (예: "1", "2", "지하1")
  ho: string      // 호 번호 (예: "101", "202")
  area: number    // 전유부 면적 (㎡)
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'

// ─── 건물 기본 정보 조회 (표제부) ─────────────────────────

export async function fetchBuilding(bdMgtSn: string): Promise<BuildingResult | null> {
  if (!bdMgtSn) return null

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/building.json')
    const results = (mockData.default as { title: BuildingResult[]; units: Record<string, BuildingUnit[]> }).title
    return results.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) {
    console.warn('[building] DATA_GO_KR_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/building.json')
    const results = (mockData.default as { title: BuildingResult[]; units: Record<string, BuildingUnit[]> }).title
    return results.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: '1',
    numOfRows: '1',
    resultType: 'json',
    bdMgtSn,
  })

  const res = await fetch(
    `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?${params}`,
  )
  if (!res.ok) throw new Error(`[building] API 오류: ${res.status}`)

  const json = await res.json()
  const item = json?.response?.body?.items?.item?.[0]
  if (!item) return null

  return {
    buildingName:    item.bldNm      ?? '',
    mainPurpose:     item.mainPurps  ?? '',   // ← 원문 그대로 저장
    totalFloorArea:  Number(item.totArea      ?? 0),
    groundFloor:     Number(item.grndFlrCnt   ?? 0),
    undergroundFloor:Number(item.ugrndFlrCnt  ?? 0),
    isViolation:     item.vltnBldYn  === '1',
    approvalDate:    item.useAprDay  ? formatDate(item.useAprDay) : '',
    bdMgtSn,
  }
}

// ─── 호별 전유부 목록 조회 (getBrExposPubuseAreaInfo) ──────
// 아파트·오피스텔·다세대주택·연립주택 등 공동주택 전용
// 단독주택·상가 등은 빈 배열 반환

export async function fetchBuildingUnits(bdMgtSn: string): Promise<BuildingUnit[]> {
  if (!bdMgtSn) return []

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/building.json')
    const units = (mockData.default as { title: BuildingResult[]; units: Record<string, BuildingUnit[]> }).units
    return units[bdMgtSn] ?? []
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) {
    console.warn('[building] DATA_GO_KR_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/building.json')
    const units = (mockData.default as { title: BuildingResult[]; units: Record<string, BuildingUnit[]> }).units
    return units[bdMgtSn] ?? []
  }

  // 전유부 전체 조회 — 최대 1000건 (대형 단지 대응)
  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: '1',
    numOfRows: '1000',
    resultType: 'json',
    bdMgtSn,
    exposPubuseGbCd: '1',  // 1 = 전유부만
  })

  const res = await fetch(
    `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?${params}`,
  )
  if (!res.ok) throw new Error(`[building] Units API 오류: ${res.status}`)

  const json = await res.json()
  const items: unknown[] = json?.response?.body?.items?.item ?? []

  // ho(호) 기준 중복 제거 후 층·호 오름차순 정렬
  const seen = new Set<string>()
  return items
    .map((it) => {
      const row = it as Record<string, unknown>
      return {
        flrNo: String(row['flrNo'] ?? ''),
        ho:    String(row['ho']    ?? ''),
        area:  Number(row['area']  ?? 0),
      }
    })
    .filter((u) => {
      if (!u.ho) return false
      if (seen.has(u.ho)) return false
      seen.add(u.ho)
      return true
    })
    .sort((a, b) => {
      const af = Number(a.flrNo) || 0
      const bf = Number(b.flrNo) || 0
      if (af !== bf) return af - bf
      return a.ho.localeCompare(b.ho, 'ko')
    })
}

// ─── 내부 유틸 ────────────────────────────────────────────

function formatDate(raw: string): string {
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }
  return raw
}
