/**
 * 건축물대장 API (data.go.kr — 건축HUB)
 * 가이드: OpenAPI활용가이드_건축HUB_건축물대장_1.0
 *
 * 필수 파라미터: sigunguCd(시군구코드 5자리) + bjdongCd(법정동코드 5자리)
 * 옵션 파라미터: bun(번 4자리), ji(지 4자리), platGbCd(대지구분)
 *
 * admCd(10자리) 분리: sigunguCd = admCd.slice(0,5) / bjdongCd = admCd.slice(5)
 */

// ─── 타입 ─────────────────────────────────────────────────

export interface BuildingQuery {
  sigunguCd:        string    // 시군구코드 5자리 (예: "11680" = 강남구)
  bjdongCd:         string    // 법정동코드 5자리 (예: "10300" = 개포동)
  bun?:             string    // 번 4자리 (예: "0012")
  ji?:              string    // 지 4자리 (예: "0000")
  platGbCd?:        string    // 대지구분코드 (0=대지, 1=산, 2=블록) — fetchBuildingUnits에서는 사용 안 함
  bjdongCdFallback?: string   // admCd 기반 법정동코드 (bdMgtSn 코드와 불일치 시 폴백용)
}

export interface BuildingResult {
  buildingName:     string   // 건물명 (bldNm)
  mainPurpose:      string   // 주용도명 (etcPurps 또는 mainPurpsCdNm)
  totalFloorArea:   number   // 연면적 ㎡ (totArea)
  groundFloor:      number   // 지상층수 (grndFlrCnt)
  undergroundFloor: number   // 지하층수 (ugrndFlrCnt)
  isViolation:      boolean  // 위반건축물 여부 (vltnBldYn)
  approvalDate:     string   // 사용승인일 YYYY-MM-DD (useAprDay)
  mgmBldrgstPk:     string   // 관리건축물대장PK (후속 조회에 사용)
}

export interface BuildingUnit {
  dongNm: string  // 동 명칭 (예: "101동", "A동"). 단동 건물은 빈 문자열
  flrNo:  string  // 층 번호
  ho:     string  // 호 번호
  area:   number  // 전유부 면적 ㎡
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'
const BASE_URL = 'https://apis.data.go.kr/1613000/BldRgstHubService'

/** JusoResult → BuildingQuery 자동 변환 헬퍼
 *
 * ⚠️ 법정동코드(bjdongCd) 추출: bdMgtSn 우선 사용
 *   - admCd 는 행정동코드(행정구역코드)이며 법정동코드와 불일치할 수 있음
 *     (예: 한남동 admCd 끝 5자리 ≠ 법정동 bjdongCd "10700")
 *   - bdMgtSn(건물관리번호 25자리) 형식:
 *       sigunguCd(5) + bjdongCd법정동(5) + platGbCd(1) + bun(4) + ji(4) + 동코드(6)
 *   - bdMgtSn 없는 경우에만 admCd 폴백 사용
 */
export function buildingQueryFromJuso(juso: {
  admCd:    string
  bdMgtSn?: string              // 건물관리번호(25자리) — 법정동코드 추출에 우선 사용
  lnbrMnnm: number | string
  lnbrSlno: number | string
  mtYn?:    string
}): BuildingQuery {
  // bdMgtSn 최소 11자리(시군구5 + 법정동5 + 대지구분1) 필요
  const hasBd = typeof juso.bdMgtSn === 'string' && juso.bdMgtSn.length >= 11

  const admBjdong = juso.admCd.slice(5)  // 행정동 기반 법정동코드 (폴백용)

  return {
    sigunguCd:        hasBd ? juso.bdMgtSn!.slice(0, 5)  : juso.admCd.slice(0, 5),
    bjdongCd:         hasBd ? juso.bdMgtSn!.slice(5, 10) : admBjdong,
    bun:              String(juso.lnbrMnnm).padStart(4, '0'),
    ji:               String(juso.lnbrSlno).padStart(4, '0'),
    platGbCd:         hasBd ? juso.bdMgtSn!.slice(10, 11) : (juso.mtYn === '1' ? '1' : '0'),
    // bdMgtSn 법정동코드와 행정동 코드가 다를 경우 대비한 폴백
    bjdongCdFallback: hasBd && juso.bdMgtSn!.slice(5, 10) !== admBjdong ? admBjdong : undefined,
  }
}

// ─── XML 파싱 헬퍼 (건축물대장 API는 XML만 반환) ──────────
interface XmlPage {
  items: Record<string, unknown>[]
  totalCount: number
  pageNo: number
  numOfRows: number
}

async function fetchXmlPage(url: string, revalidate = 3600): Promise<XmlPage> {
  // Next.js 서버사이드 캐시: 프로덕션에서만 캐싱, 개발 중에는 no-store로 즉시 반영
  const fetchOpts = process.env.NODE_ENV === 'production'
    ? { next: { revalidate } }
    : { cache: 'no-store' as const }
  const res = await fetch(url, fetchOpts)
  const txt = await res.text()
  if (!res.ok) throw new Error(`[building] HTTP ${res.status}`)

  const { XMLParser } = await import('fast-xml-parser')
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true })
  const data   = parser.parse(txt) as Record<string, unknown>
  const body   = (data?.response as Record<string, unknown>)?.body as Record<string, unknown>
  const raw    = (body?.items as Record<string, unknown>)?.item
  const items  = !raw ? [] : Array.isArray(raw) ? raw as Record<string, unknown>[] : [raw as Record<string, unknown>]

  return {
    items,
    totalCount: Number(body?.totalCount ?? items.length),
    pageNo:     Number(body?.pageNo     ?? 1),
    numOfRows:  Number(body?.numOfRows  ?? items.length),
  }
}

async function fetchXmlItems(url: string): Promise<Record<string, unknown>[]> {
  return (await fetchXmlPage(url)).items
}

async function fetchXmlItemsPaged(
  endpoint: string,
  apiKey: string,
  params: URLSearchParams,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let pageNo = 1
  const numOfRows = Number(params.get('numOfRows') ?? 1000)
  // Some Building HUB endpoints cap each response at 100 rows even when
  // numOfRows=1000 is requested. Large apartment complexes can exceed 50 pages.
  const maxPages = 300

  while (pageNo <= maxPages) {
    params.set('pageNo', String(pageNo))
    params.set('numOfRows', String(numOfRows))
    const page = await fetchXmlPage(`${BASE_URL}/${endpoint}?serviceKey=${apiKey}&${params}`)
    all.push(...page.items)

    const totalCount = page.totalCount || all.length
    const pageSize = page.numOfRows || numOfRows
    if (all.length >= totalCount || page.items.length === 0 || pageNo >= Math.ceil(totalCount / pageSize)) {
      break
    }
    pageNo += 1
  }

  return all
}

// ─── 건물 기본 정보 조회 (표제부 getBrTitleInfo) ───────────

export async function fetchBuilding(query: BuildingQuery): Promise<BuildingResult | null> {
  const { sigunguCd, bjdongCd, bun, ji, platGbCd } = query
  if (!sigunguCd || !bjdongCd) return null

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/building.json')
    const results = (mockData.default as { title: BuildingResult[] }).title
    return results[0] ?? null
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) {
    console.warn('[building] DATA_GO_KR_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/building.json')
    return (mockData.default as { title: BuildingResult[] }).title[0] ?? null
  }

  // data.go.kr 건축물대장 API는 XML만 반환 (resultType=json 무시됨)
  const params = new URLSearchParams({
    pageNo: '1', numOfRows: '1',
    sigunguCd, bjdongCd,
    ...(platGbCd !== undefined && { platGbCd }),
    ...(bun !== undefined && { bun }),
    ...(ji  !== undefined && { ji }),
  })

  const list = await fetchXmlItems(`${BASE_URL}/getBrTitleInfo?serviceKey=${apiKey}&${params}`)
  const item = list[0]
  if (!item) return null

  return {
    buildingName:     String(item.bldNm       ?? ''),
    mainPurpose:      String(item.etcPurps     ?? item.mainPurpsCdNm ?? ''),
    totalFloorArea:   Number(item.totArea      ?? 0),
    groundFloor:      Number(item.grndFlrCnt   ?? 0),
    undergroundFloor: Number(item.ugrndFlrCnt  ?? 0),
    isViolation:      item.vltnBldYn === '1',
    approvalDate:     item.useAprDay ? formatDate(String(item.useAprDay)) : '',
    mgmBldrgstPk:     String(item.mgmBldrgstPk ?? ''),
  }
}

// ─── 호별 전유부 목록 조회 ─────────────────────────────────

export async function fetchBuildingUnits(query: BuildingQuery): Promise<BuildingUnit[]> {
  const { sigunguCd, bjdongCd, bun, ji, platGbCd } = query
  if (!sigunguCd || !bjdongCd) return []

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/building.json')
    return (mockData.default as { units: BuildingUnit[] }).units ?? []
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) return []

  // ⚠️ platGbCd·exposPubuseGbCd 를 전달하지 않음:
  //   platGbCd API 필터는 '1'(산) 등을 잘못 넣으면 등록이 다른 건물이 0건으로 반환됨.
  //   exposPubuseGbCd는 요청 명세에 없는 파라미터.
  const makeParams = (bj: string) => new URLSearchParams({
    pageNo: '1', numOfRows: '1000',
    sigunguCd, bjdongCd: bj,
    ...(bun !== undefined && { bun }),
    ...(ji  !== undefined && { ji }),
  })

  let list = await fetchXmlItemsPaged('getBrExposPubuseAreaInfo', apiKey, makeParams(bjdongCd))

  // bjdongCd 폴백: bdMgtSn 기반 법정동코드가 건축물대장과 불일치할 경우
  // bun+ji가 있으면 admCd 기반 코드도 시도 (bun 없이 조회하면 범위가 너무 넓음)
  if (list.length === 0 && query.bjdongCdFallback && query.bjdongCdFallback !== bjdongCd) {
    list = await fetchXmlItemsPaged('getBrExposPubuseAreaInfo', apiKey, makeParams(query.bjdongCdFallback))
  }

  const unitsByKey = new Map<string, BuildingUnit & { flrGbCd: string; exposGb: string }>()
  list
    .map((it) => {
      const row = it as Record<string, unknown>
      // API 응답 필드:
      //   dongNm          = "302"   (숫자만, "동" suffix 없음) → "302동"으로 정규화
      //   hoNm            = "407호" (suffix 있음) — 필드명이 ho 가 아닌 hoNm 임에 주의
      //   exposPubuseGbCd = "1"(전유부) / "2"(공용부) — 공용부 항목 필터링에 사용
      const rawDong = String(row.dongNm ?? '').trim()
      const dong    = rawDong && /^\d+$/.test(rawDong) ? `${rawDong}동` : rawDong
      const rawHo   = String(row.hoNm ?? row.ho ?? '').trim() // hoNm 우선, mock 호환용 ho 폴백
      const exposGb = String(row.exposPubuseGbCd ?? '').trim() // "1"=전유, "2"=공용
      const flrGbCd = String(row.flrGbCd ?? '').trim()         // "10"=지하, "20"=지상
      return {
        dongNm:   dong,
        flrNo:    String(row.flrNo ?? '').trim(),
        ho:       rawHo,
        area:     Number(row.area  ?? 0),
        flrGbCd,
        exposGb,  // 필터링 후 제거 (BuildingUnit 타입에는 없음)
      }
    })
    .filter((u) => {
      // 호 번호 없는 항목 제거
      if (!u.ho) return false
      // 공용부(2) 제거 — exposPubuseGbCd 값이 있을 때만 적용. 없으면 통과(호환성)
      if (u.exposGb && u.exposGb !== '1') return false
      // 층 번호가 없거나 0 이하인 항목 제거 (공용부 혼입 방어)
      const flr = Number(u.flrNo)
      if (u.flrNo === '' || isNaN(flr) || flr <= 0) return false
      return true
    })
    .forEach((unit) => {
      const key = `${unit.dongNm}|${unit.ho}`
      const prev = unitsByKey.get(key)
      if (!prev || compareUnitCandidate(unit, prev) > 0) {
        unitsByKey.set(key, unit)
      }
    })

  return [...unitsByKey.values()]
    .map(({ exposGb: _exposGb, flrGbCd: _flrGbCd, ...unit }) => unit) // 임시 필드 제거
    .sort((a, b) => {
      // 동 → 층 → 호(숫자) 순 정렬
      const dongCmp = a.dongNm.localeCompare(b.dongNm, 'ko')
      if (dongCmp !== 0) return dongCmp
      const af = Number(a.flrNo) || 0
      const bf = Number(b.flrNo) || 0
      if (af !== bf) return af - bf
      // 호 번호에서 숫자 추출 후 비교 ("101호" → 101, "1003호" → 1003)
      const ah = parseInt(a.ho, 10) || 0
      const bh = parseInt(b.ho, 10) || 0
      return ah !== bh ? ah - bh : a.ho.localeCompare(b.ho, 'ko')
    })
}

function compareUnitCandidate(
  a: BuildingUnit & { flrGbCd: string; exposGb: string },
  b: BuildingUnit & { flrGbCd: string; exposGb: string },
): number {
  const score = (unit: BuildingUnit & { flrGbCd: string; exposGb: string }) => {
    let value = 0
    if (unit.flrGbCd === '20') value += 1_000_000
    if (unit.flrGbCd === '10') value -= 1_000_000
    value += Math.round(unit.area * 100)
    return value
  }
  return score(a) - score(b)
}

// ─── 유틸 ──────────────────────────────────────────────────

function formatDate(raw: string): string {
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw
}
