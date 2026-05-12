/**
 * VWorld API — 용도지역·공시지가 조회
 *
 * 전략:
 *   1차 (우선): 도로명주소 지오코딩 → WGS84 좌표 → POINT geomFilter로 두 레이어 동시 조회
 *   2차 (폴백): PNU attrFilter → geometry에서 좌표 추출 → LT_C_UQ111 조회
 *
 * 레이어:
 *   LP_PA_CBND_BUBUN (연속지적도): geomFilter POINT, attrFilter pnu 둘 다 지원
 *   LT_C_UQ111       (용도지역):   geomFilter POINT만 지원 (attrFilter 미지원)
 *
 * 지오코딩 API: https://api.vworld.kr/req/address
 *   → service=address & request=getcoord & address={도로명주소} & type=road
 *   → result.point.x(경도), result.point.y(위도) in WGS84
 *
 * 2D Data API: https://api.vworld.kr/req/data
 *   → 서버사이드 호출 시 domain 파라미터 필수 (등록된 서비스 URL)
 */

export interface VWorldResult {
  bdMgtSn:           string
  landUseZone:       string  // 용도지역 (LT_C_UQ111 → uname)
  officialLandPrice: number  // 공시지가 원/㎡ (LP_PA_CBND_BUBUN → jiga)
  pricedAt:          string  // 공시기준년도 YYYY
}

const USE_MOCK       = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'
const VWORLD_DATA    = 'https://api.vworld.kr/req/data'
const VWORLD_GEOCODE = 'https://api.vworld.kr/req/address'

// ─── PNU 유틸 ─────────────────────────────────────────────

/** bdMgtSn 앞 19자리 = PNU */
function pnuFromBdMgtSn(bdMgtSn: string): string {
  return bdMgtSn.slice(0, 19)
}

/**
 * 법정동코드(10) + 대지구분(1) + 지번본번(4) + 지번부번(4) → PNU (19자리)
 * bdMgtSn 내부 대지구분이 실제 지목과 다른 경우가 있어 명시적 파라미터 우선 사용
 */
export function buildPnu(
  admCd10: string,   // 시군구코드(5) + 법정동코드(5) = 10자리
  platGbCd: string,  // '0'=대지, '1'=산
  bun: string,       // 지번본번 (4자리, 앞 zero-pad)
  ji: string,        // 지번부번 (4자리, 앞 zero-pad)
): string {
  return (
    admCd10.padEnd(10, '0').slice(0, 10) +
    platGbCd +
    bun.padStart(4, '0').slice(0, 4) +
    ji.padStart(4, '0').slice(0, 4)
  )
}

// ─── VWorld GetFeature 공통 호출 ───────────────────────────

interface FeatureOptions {
  attrFilter?: string
  geomFilter?: string   // e.g. "POINT(126.97 37.56)"
  geometry?:   boolean  // 지오메트리 포함 여부 (default false)
}

async function getFeatures(
  data:   string,
  opts:   FeatureOptions,
  key:    string,
  domain: string,
): Promise<Record<string, unknown>[]> {
  const params: Record<string, string> = {
    service:  'data',
    version:  '2.0',
    request:  'GetFeature',
    data,
    key,
    domain,
    geometry: String(opts.geometry ?? false),
    format:   'json',
  }
  if (opts.attrFilter) params.attrFilter = opts.attrFilter
  if (opts.geomFilter) params.geomFilter = opts.geomFilter

  const res  = await fetch(`${VWORLD_DATA}?${new URLSearchParams(params)}`)
  const json = await res.json() as Record<string, unknown>
  const resp = json?.response as Record<string, unknown>

  if (resp?.status !== 'OK') {
    const err = resp?.error as Record<string, unknown>
    console.warn(`[vworld] ${data} 조회 실패: ${err?.code ?? resp?.status}`)
    return []
  }

  const features = (
    (resp?.result as Record<string, unknown>)
    ?.featureCollection as Record<string, unknown>
  )?.features

  if (!features) return []
  return Array.isArray(features) ? (features as Record<string, unknown>[]) : []
}

// ─── 지오코딩 ─────────────────────────────────────────────

/**
 * 도로명주소 → WGS84 좌표 (VWorld 주소 지오코딩 API)
 * 실패 시 null 반환 (예외 throw 안 함)
 */
async function geocodeRoadAddr(
  roadAddr: string,
  key:      string,
  domain:   string,
): Promise<{ x: number; y: number } | null> {
  const params = new URLSearchParams({
    service: 'address',
    request: 'getcoord',
    address: roadAddr,
    type:    'road',
    key,
    domain,
    format:  'json',
  })

  try {
    const res  = await fetch(`${VWORLD_GEOCODE}?${params}`)
    const json = await res.json() as Record<string, unknown>
    const resp = json?.response as Record<string, unknown>

    if (resp?.status !== 'OK') {
      console.warn(`[vworld] 지오코딩 실패 (${roadAddr}): ${resp?.status}`)
      return null
    }

    const point = (resp?.result as Record<string, unknown>)
      ?.point as Record<string, unknown> | undefined

    const x = Number(point?.x)
    const y = Number(point?.y)
    if (!x || !y) return null

    return { x, y }
  } catch (e) {
    console.warn('[vworld] 지오코딩 예외:', e)
    return null
  }
}

// ─── 폴리곤 geometry에서 첫 번째 좌표 추출 ───────────────

function firstPointFromGeometry(
  geometry: Record<string, unknown> | undefined,
): { x: number; y: number } | null {
  if (!geometry) return null
  const type   = geometry.type as string
  const coords = geometry.coordinates as unknown

  try {
    if (type === 'Polygon') {
      const pt = (coords as number[][][])[0]?.[0]
      return pt ? { x: pt[0], y: pt[1] } : null
    }
    if (type === 'MultiPolygon') {
      const pt = (coords as number[][][][])[0]?.[0]?.[0]
      return pt ? { x: pt[0], y: pt[1] } : null
    }
  } catch { /* empty */ }
  return null
}

// ─── POINT 기반 조회 (지오코딩 성공 또는 PNU geometry에서 추출한 좌표) ──

async function queryByPoint(
  pt:     { x: number; y: number },
  key:    string,
  domain: string,
): Promise<{ officialLandPrice: number; pricedAt: string; landUseZone: string }> {
  const geomFilter = `POINT(${pt.x} ${pt.y})`

  const [landResult, zoneResult] = await Promise.allSettled([
    getFeatures('LP_PA_CBND_BUBUN', { geomFilter }, key, domain),
    getFeatures('LT_C_UQ111',       { geomFilter }, key, domain),
  ])

  const landFeatures = landResult.status === 'fulfilled' ? landResult.value : []
  const zoneFeatures = zoneResult.status === 'fulfilled' ? zoneResult.value : []

  const landProps = landFeatures[0]?.properties as Record<string, unknown> | undefined
  const zoneProps = zoneFeatures[0]?.properties as Record<string, unknown> | undefined

  // LP_PA_CBND_BUBUN 필드명: jiga(공시지가 원/㎡), gosi_year(기준년도)
  const officialLandPrice = Number(landProps?.jiga ?? 0)
  const pricedAt          = String(landProps?.gosi_year ?? '')

  // LT_C_UQ111 필드명: uname(용도지역명)
  const landUseZone = zoneProps?.uname
    ? String(zoneProps.uname)
    : '정보 없음'

  return { officialLandPrice, pricedAt, landUseZone }
}

// ─── 메인 조회 함수 ────────────────────────────────────────

export interface FetchVWorldOpts {
  /** buildPnu()로 명시적으로 생성한 PNU (19자리). 없으면 bdMgtSn 앞 19자리 사용. */
  pnuOverride?: string
  /** 도로명주소. 있으면 지오코딩을 1차 전략으로 사용 (PNU보다 신뢰도 높음). */
  roadAddr?: string
}

/**
 * VWorld에서 용도지역·공시지가를 조회합니다.
 *
 * 전략 우선순위:
 *   1. roadAddr 지오코딩 → POINT 동시 조회 (가장 신뢰도 높음)
 *   2. PNU attrFilter → geometry 좌표 추출 → POINT 조회 (PNU 매칭 필요)
 */
export async function fetchVWorld(
  bdMgtSn: string,
  opts?: FetchVWorldOpts,
): Promise<VWorldResult | null> {
  if (!bdMgtSn) return null

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/vworld.json')
    const results  = mockData.default as VWorldResult[]
    return results.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }

  const apiKey = process.env.VWORLD_API_KEY
  if (!apiKey) {
    console.warn('[vworld] VWORLD_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/vworld.json')
    const results  = mockData.default as VWorldResult[]
    return results.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }

  const domain = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    // ── 전략 1: 도로명주소 지오코딩 → POINT 조회 ─────────
    if (opts?.roadAddr) {
      console.info(`[vworld] 전략1 지오코딩: "${opts.roadAddr}"`)
      const pt = await geocodeRoadAddr(opts.roadAddr, apiKey, domain)
      if (pt) {
        const result = await queryByPoint(pt, apiKey, domain)
        console.info(`[vworld] 전략1 결과: 용도지역=${result.landUseZone}, 공시지가=${result.officialLandPrice}`)
        return { bdMgtSn, ...result }
      }
      console.warn('[vworld] 지오코딩 실패 → PNU 폴백 전략으로 전환')
    }

    // ── 전략 2: PNU attrFilter → geometry 좌표 → POINT 조회 ──
    const pnu = opts?.pnuOverride ?? pnuFromBdMgtSn(bdMgtSn)
    console.info(`[vworld] 전략2 PNU: ${pnu}`)

    let features = await getFeatures(
      'LP_PA_CBND_BUBUN',
      { attrFilter: `pnu:=:${pnu}`, geometry: true },
      apiKey, domain,
    )
    console.info(`[vworld] LP_PA_CBND_BUBUN 피처 수: ${features.length}`)

    // 대지구분(위치 10) 반전 재시도
    if (features.length === 0) {
      const altPlatGb = pnu[10] === '0' ? '1' : '0'
      const altPnu    = pnu.slice(0, 10) + altPlatGb + pnu.slice(11)
      console.info(`[vworld] PNU 대지구분 반전 재시도: ${altPnu}`)
      features = await getFeatures(
        'LP_PA_CBND_BUBUN',
        { attrFilter: `pnu:=:${altPnu}`, geometry: true },
        apiKey, domain,
      )
      console.info(`[vworld] 재시도 피처 수: ${features.length}`)
    }

    if (features.length > 0) {
      const geom = features[0]?.geometry as Record<string, unknown> | undefined
      const pt   = firstPointFromGeometry(geom)
      if (pt) {
        console.info(`[vworld] geometry 좌표 획득: (${pt.x}, ${pt.y})`)
        const result = await queryByPoint(pt, apiKey, domain)
        console.info(`[vworld] 전략2 결과: 용도지역=${result.landUseZone}, 공시지가=${result.officialLandPrice}`)
        return { bdMgtSn, ...result }
      }
    }

    console.warn('[vworld] 모든 전략 실패 — 데이터 없음 반환')
    return { bdMgtSn, landUseZone: '정보 없음', officialLandPrice: 0, pricedAt: '' }
  } catch (e) {
    console.error('[vworld] 조회 실패:', e)
    return null
  }
}
