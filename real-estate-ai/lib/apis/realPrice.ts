/**
 * 국토교통부 부동산 실거래가 API (data.go.kr)
 *
 * 지원 거래 유형 (8종):
 *   매매:   아파트 / 연립다세대 / 단독다가구 / 오피스텔
 *   전월세: 아파트 / 연립다세대 / 단독다가구 / 오피스텔
 *
 * 등록된 엔드포인트 (data.go.kr 활용신청 완료):
 *   아파트 매매 (상세): RTMSDataSvcAptTradeDev
 *   아파트 전월세:      RTMSDataSvcAptRent
 *   연립다세대 매매:    RTMSDataSvcRHTrade
 *   연립다세대 전월세:  RTMSDataSvcRHRent
 *   단독다가구 매매:    RTMSDataSvcSHTrade
 *   단독다가구 전월세:  RTMSDataSvcSHRent
 *   오피스텔 매매:      RTMSDataSvcOffiTrade
 *   오피스텔 전월세:    RTMSDataSvcOffiRent
 *
 * 공통 응답 특성:
 *   - XML 전용 (resultType=json 무시됨)
 *   - 필드명: 영문 camelCase (한글 필드 없음)
 *   - 금액 단위: 만원 (× 10000 → 원)
 *   - items.item: 1건이면 object, 복수이면 array
 *
 * 조회 전략:
 *   8개 엔드포인트 × 최근 N개월 병렬 조회 →
 *   지번(jibun)으로 필터링 → 날짜 내림차순 정렬
 */

export interface RealPriceDeal {
  dealYear:     number
  dealMonth:    number
  dealDay:      number
  apartName:    string   // 건물명 (aptNm / mhouseNm / houseType / offiNm)
  area:         number   // 전용면적 (㎡). 단독다가구는 totalFloorAr
  floor:        number   // 층. 단독다가구는 0
  dealAmount:   number   // 매매가 또는 전세보증금 (원)
  monthlyRent:  number   // 월세금액 (원). 매매·전세는 0
  dealType:     string   // 매매 | 전세 | 월세
  buildingType: string   // 아파트 | 연립다세대 | 단독다가구 | 오피스텔
  dealingGbn:   string   // 거래유형: 중개거래 | 직거래 (매매만)
  buildYear:    number   // 건축년도
}

export interface FetchRealPriceOpts {
  /**
   * 지번본번 (연립다세대·오피스텔·단독다가구 매매 필터링용).
   * 예: 810 → jibun 필드의 본번과 대조.
   * jibun 필드가 없는 레코드(단독다가구 전월세 등)는 필터링 시 제외됨.
   */
  lnbrMnnm?: number
  /**
   * 건물명 (아파트 필터링용).
   * aptNm 필드에 이 값이 포함되는 레코드만 반환.
   * 예: "옥수동극동아파트" → aptNm이 해당 단지명인 건만 포함.
   */
  buildingName?: string
  /** 조회 개월 수 (default 60 = 5년) */
  months?: number
}

interface MockEntry {
  bdMgtSn: string
  deals: RealPriceDeal[]
}

/**
 * API 응답 XML item — 모든 필드 영문 camelCase
 * 필드 존재 여부는 엔드포인트별로 다를 수 있음
 */
interface RawItem {
  // 날짜 (8종 공통)
  dealYear?:     string | number
  dealMonth?:    string | number
  dealDay?:      string | number
  // 매매금액 (매매 4종)
  dealAmount?:   string | number
  // 해제 여부 (매매): 값이 있으면 취소된 거래 → 필터 제외
  cdealType?:    string
  // 거래유형 (매매): "중개거래" | "직거래"
  dealingGbn?:   string
  // 건축년도
  buildYear?:    string | number
  // 전월세금액 (전월세 4종)
  deposit?:      string | number   // 보증금
  monthlyRent?:  string | number   // 월세 (0이면 전세)
  // 전용면적
  excluUseAr?:   string | number   // 아파트·연립다세대·오피스텔
  totalFloorAr?: string | number   // 단독다가구
  // 층 (단독다가구 없음)
  floor?:        string | number
  // 지번 (단독다가구 전월세는 없을 수 있음)
  jibun?:        string | number
  // 건물명 (엔드포인트별 필드명 다름)
  aptNm?:        string   // 아파트
  mhouseNm?:     string   // 연립다세대
  houseType?:    string   // 단독다가구(단독/다가구) 또는 연립다세대(연립/다세대)
  offiNm?:       string   // 오피스텔
}

/** 엔드포인트 설정 */
interface EndpointConfig {
  url:          string
  buildingType: string
  isRent:       boolean
  nameField:    keyof Pick<RawItem, 'aptNm' | 'mhouseNm' | 'houseType' | 'offiNm'>
  areaField:    keyof Pick<RawItem, 'excluUseAr' | 'totalFloorAr'>
}

const ENDPOINT_CONFIGS: EndpointConfig[] = [
  // ── 매매 4종 ─────────────────────────────────────────────
  {
    url:          'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
    buildingType: '아파트',
    isRent:       false,
    nameField:    'aptNm',
    areaField:    'excluUseAr',
  },
  {
    url:          'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade',
    buildingType: '연립다세대',
    isRent:       false,
    nameField:    'mhouseNm',
    areaField:    'excluUseAr',
  },
  {
    url:          'https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade',
    buildingType: '단독다가구',
    isRent:       false,
    nameField:    'houseType',
    areaField:    'totalFloorAr',
  },
  {
    url:          'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade',
    buildingType: '오피스텔',
    isRent:       false,
    nameField:    'offiNm',
    areaField:    'excluUseAr',
  },
  // ── 전월세 4종 ───────────────────────────────────────────
  {
    url:          'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
    buildingType: '아파트',
    isRent:       true,
    nameField:    'aptNm',
    areaField:    'excluUseAr',
  },
  {
    url:          'https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent',
    buildingType: '연립다세대',
    isRent:       true,
    nameField:    'mhouseNm',
    areaField:    'excluUseAr',
  },
  {
    url:          'https://apis.data.go.kr/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent',
    buildingType: '단독다가구',
    isRent:       true,
    nameField:    'houseType',
    areaField:    'totalFloorAr',
  },
  {
    url:          'https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent',
    buildingType: '오피스텔',
    isRent:       true,
    nameField:    'offiNm',
    areaField:    'excluUseAr',
  },
]

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'

// ─── 유틸 ────────────────────────────────────────────────────

/** 최근 N개월 YYYYMM 목록 (최신 순) */
function recentMonths(n: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }
  return result
}

/** "25,200" 또는 " 98,700" (만원) → 252000000 (원) */
function parseAmount(raw: string | number | undefined): number {
  if (raw === null || raw === undefined) return 0
  const num = Number(String(raw).replace(/[,\s]/g, ''))
  return isNaN(num) ? 0 : num * 10000
}

function toRealPriceDeal(item: RawItem, cfg: EndpointConfig): RealPriceDeal {
  let dealAmount: number
  let monthlyRent: number
  let dealType: string

  if (cfg.isRent) {
    dealAmount  = parseAmount(item.deposit)
    monthlyRent = parseAmount(item.monthlyRent)
    dealType    = monthlyRent > 0 ? '월세' : '전세'
  } else {
    dealAmount  = parseAmount(item.dealAmount)
    monthlyRent = 0
    dealType    = '매매'
  }

  return {
    dealYear:     Number(item.dealYear  ?? 0),
    dealMonth:    Number(item.dealMonth ?? 0),
    dealDay:      Number(item.dealDay   ?? 0),
    apartName:    String(item[cfg.nameField] ?? ''),
    area:         Number(item[cfg.areaField] ?? 0),
    floor:        Number(item.floor ?? 0),   // 단독다가구는 floor 없음 → 0
    dealAmount,
    monthlyRent,
    dealType,
    buildingType: cfg.buildingType,
    dealingGbn:   String(item.dealingGbn ?? ''),
    buildYear:    Number(item.buildYear  ?? 0),
  }
}

/** 날짜 기준 내림차순 정렬 키 */
function dealSortKey(d: RealPriceDeal): number {
  return d.dealYear * 10000 + d.dealMonth * 100 + d.dealDay
}

// ─── 단일 엔드포인트 × 단일 월 조회 ─────────────────────────

async function fetchMonthForConfig(
  cfg:           EndpointConfig,
  sigunguCd:    string,
  dealYmd:      string,
  apiKey:       string,
  jibunTarget?: string,   // 연립·오피스텔·단독 매매용 지번 필터
  nameTarget?:  string,   // 아파트용 aptNm 필터 (소문자 정규화됨)
): Promise<RealPriceDeal[]> {
  const params = new URLSearchParams({
    LAWD_CD:   sigunguCd,
    DEAL_YMD:  dealYmd,
    numOfRows: '100',
    pageNo:    '1',
  })

  let txt = ''
  try {
    // serviceKey를 URL에 직접 삽입 (URLSearchParams 이중인코딩 방지)
    const url = `${cfg.url}?serviceKey=${apiKey}&${params}`
    const res = await fetch(url)
    txt = await res.text()

    if (res.status === 403) {
      console.warn(
        `[realPrice][${cfg.buildingType}${cfg.isRent ? '전월세' : '매매'}] ` +
        `403 Forbidden (${dealYmd}) — data.go.kr 활용신청 필요: ` +
        'https://www.data.go.kr/data/15057511/openapi.do'
      )
      return []
    }
    if (!res.ok) {
      console.warn(
        `[realPrice][${cfg.buildingType}${cfg.isRent ? '전월세' : '매매'}] ` +
        `HTTP ${res.status} (${dealYmd})`
      )
      return []
    }
  } catch (e) {
    console.warn(`[realPrice][${cfg.buildingType}] fetch 오류 (${dealYmd}):`, e)
    return []
  }

  try {
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true })
    const data   = parser.parse(txt) as Record<string, unknown>

    const body = (data?.response as Record<string, unknown>)?.body as Record<string, unknown>
    const raw  = (body?.items as Record<string, unknown>)?.item

    if (raw === null || raw === undefined) return []

    const list: RawItem[] = Array.isArray(raw)
      ? (raw as RawItem[])
      : [raw as RawItem]

    // ── 해제된(취소) 거래 제거
    // 정상 거래: cdealType 필드 없음(undefined) 또는 빈 문자열('')
    // 취소 거래: 그 외 값 ("취소", "Y" 등) → 제외
    const active = list.filter(
      (item) => item.cdealType === undefined || item.cdealType === null || item.cdealType === ''
    )

    // ── 필터링 전략 ──────────────────────────────────────────
    // 아파트·오피스텔: 건물명(aptNm·offiNm) 포함 여부로 단지 특정
    //   → jibun은 복합단지에서 신뢰도 낮음. 이름이 있으면 이름 우선.
    // 연립다세대·단독다가구: jibun 본번 일치 여부
    //   → jibun 없는 레코드를 통과시키면 구 전체 데이터가 혼입됨
    const filtered = (() => {
      if (cfg.nameField === 'aptNm' && nameTarget) {
        // 아파트: aptNm 포함 여부로 필터
        return active.filter((item) =>
          String(item.aptNm ?? '').replace(/\s/g, '').toLowerCase()
            .includes(nameTarget)
        )
      }
      if (cfg.nameField === 'offiNm' && nameTarget) {
        // 오피스텔: offiNm 이름 필터 + jibun 폴백
        // Juso bdNm("위너스 오피스텔")과 실거래가 API offiNm이 다를 수 있으므로
        // 이름 일치 건이 0이면 jibun 필터로 폴백해 데이터 누락 방지
        const byName = active.filter((item) =>
          String(item.offiNm ?? '').replace(/\s/g, '').toLowerCase()
            .includes(nameTarget)
        )
        if (byName.length > 0) return byName

        // 폴백: jibun 본번 일치
        if (jibunTarget) {
          return active.filter((item) => {
            const jibun = String(item.jibun ?? '').trim()
            if (!jibun) return false
            return jibun.split(/[-\s]/)[0].trim() === jibunTarget
          })
        }
        return active
      }
      if (jibunTarget) {
        // 연립다세대·단독다가구: jibun 본번 일치
        // jibun 포맷: "285-1"(하이픈) 또는 "285 1"(공백) 모두 대응
        return active.filter((item) => {
          const jibun = String(item.jibun ?? '').trim()
          if (!jibun) return false   // jibun 없는 레코드는 제외 (혼입 방지)
          return jibun.split(/[-\s]/)[0].trim() === jibunTarget
        })
      }
      return active  // 필터 조건 없으면 취소 제거만 적용
    })()

    return filtered.map((item) => toRealPriceDeal(item, cfg))
  } catch (e) {
    console.warn(`[realPrice][${cfg.buildingType}] ${dealYmd} 파싱 오류:`, e)
    return []
  }
}

// ─── 메인 함수 ───────────────────────────────────────────────

export async function fetchRealPrice(
  bdMgtSn: string,
  opts?: FetchRealPriceOpts,
): Promise<RealPriceDeal[]> {
  if (!bdMgtSn) return []

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/realPrice.json')
    const entries  = mockData.default as MockEntry[]
    return entries.find((e) => e.bdMgtSn === bdMgtSn)?.deals ?? []
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) {
    console.warn('[realPrice] DATA_GO_KR_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/realPrice.json')
    const entries  = mockData.default as MockEntry[]
    return entries.find((e) => e.bdMgtSn === bdMgtSn)?.deals ?? []
  }

  const sigunguCd   = bdMgtSn.slice(0, 5)
  const monthCount  = opts?.months ?? 60   // 기본 5년(60개월)
  const jibunTarget = opts?.lnbrMnnm != null ? String(opts.lnbrMnnm) : undefined
  // aptNm 필터: 공백 제거 + 소문자로 정규화하여 부분 일치 검색
  const nameTarget  = opts?.buildingName
    ? opts.buildingName.replace(/\s/g, '').toLowerCase()
    : undefined

  const months = recentMonths(monthCount)

  // 8종 × N개월 병렬 실행
  const tasks = ENDPOINT_CONFIGS.flatMap((cfg) =>
    months.map((m) => fetchMonthForConfig(cfg, sigunguCd, m, apiKey, jibunTarget, nameTarget))
  )

  const results = await Promise.allSettled(tasks)

  const deals = results
    .filter((r): r is PromiseFulfilledResult<RealPriceDeal[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => dealSortKey(b) - dealSortKey(a))

  return deals
}
