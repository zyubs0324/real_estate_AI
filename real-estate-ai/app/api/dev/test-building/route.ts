/**
 * [DEV ONLY] Juso → 건축물대장 통합 테스트 (주소 기반 조회)
 * GET http://localhost:3000/api/dev/test-building?q=서울강남구개포동주공아파트
 */
import { NextRequest, NextResponse } from 'next/server'

async function fetchParsed(url: string): Promise<unknown> {
  const res = await fetch(url)
  const txt = await res.text()
  // JSON 먼저 시도, 실패 시 XML 파싱
  try { return JSON.parse(txt) } catch { /* XML */ }
  try {
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true })
    return parser.parse(txt)
  } catch { return { _raw: txt.slice(0, 400) } }
}

function pad(n: string | number, len: number) {
  return String(n).padStart(len, '0')
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const q       = req.nextUrl.searchParams.get('q') ?? '서울 송파구 잠실동 잠실엘스아파트'
  const jusoKey = process.env.JUSO_API_KEY       ?? ''
  const bldKey  = process.env.DATA_GO_KR_API_KEY ?? ''

  // ── Step 1: Juso 주소 검색 ──────────────────────────────────
  const jusoParams = new URLSearchParams({
    currentPage: '1', countPerPage: '3',
    keyword: q, confmKey: jusoKey, resultType: 'json',
  })
  const jusoData = await fetchParsed(
    `https://www.juso.go.kr/addrlink/addrLinkApi.do?${jusoParams}`,
  ) as Record<string, unknown>

  // ── noFilterTest: Juso 결과와 무관하게 API 자체 동작 먼저 확인 ──
  const noFilterParams = new URLSearchParams({ pageNo: '1', numOfRows: '1', resultType: 'json' })
  const noFilterRaw = await fetchParsed(
    `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${bldKey}&${noFilterParams}`,
  ) as Record<string, unknown>
  const noFilterItems = (noFilterRaw?.body as Record<string, unknown>)?.items as Record<string, unknown> | undefined
  const noFilterItem  = Array.isArray(noFilterItems?.item) ? (noFilterItems!.item as unknown[])[0] : noFilterItems?.item

  const jusoList = (jusoData?.results as Record<string, unknown>)?.juso as Record<string, unknown>[]
  if (!jusoList?.length) {
    return NextResponse.json({
      error: 'Juso 결과 없음', query: q,
      noFilterTest: { hasData: !!noFilterItem, item: noFilterItem ?? null, raw: noFilterRaw },
    })
  }

  const j          = jusoList[0]
  const admCd      = String(j.admCd   ?? '')   // 행정구역코드 10자리
  const sigunguCd  = admCd.slice(0, 5)         // 앞 5자리 → 시군구코드 (예: 11680)
  const bjdongCd   = admCd.slice(5)            // 뒤 5자리 → 법정동코드 (예: 10300)
  const bun        = pad(String(j.lnbrMnnm ?? 0), 4)  // 지번본번 4자리
  const ji         = pad(String(j.lnbrSlno ?? 0), 4)  // 지번부번 4자리
  const mtYn       = String(j.mtYn ?? '0')
  const roadAddr   = String(j.roadAddr ?? '')

  // ── Step 2: 건축물대장 조회 (가이드 확인된 정확한 파라미터) ──
  // sigunguCd + bjdongCd 필수 / bun + ji 옵션
  const baseQuery = {
    pageNo: '1', numOfRows: '1', resultType: 'json',
    sigunguCd,   // ← 가이드: 시군구코드 (필수)
    bjdongCd,    // ← 가이드: 법정동코드 (필수)
    platGbCd: mtYn,
    bun, ji,
  }

  const endpoints = [
    { name: '표제부(일반건물)',     path: 'getBrTitleInfo' },
    { name: '총괄표제부(집합건물)', path: 'getBrRecapTitleInfo' },
    { name: '층별개요',            path: 'getBrFlrOulnInfo' },
  ]

  const bldResults: Record<string, unknown> = {}
  for (const ep of endpoints) {
    const p = new URLSearchParams(baseQuery)
    const d = await fetchParsed(
      `https://apis.data.go.kr/1613000/BldRgstHubService/${ep.path}?serviceKey=${bldKey}&${p}`,
    ) as Record<string, unknown>

    // XML 파싱 결과: response.body.items.item
    const body  = (d?.response as Record<string, unknown>)?.body as Record<string, unknown> | undefined
    const items = (body?.items as Record<string, unknown>)
    const item  = Array.isArray(items?.item) ? (items.item as unknown[])[0] : items?.item

    bldResults[ep.name] = { hasData: !!item, item: item ?? null, raw: d }
  }

  return NextResponse.json({
    query: q, roadAddr,
    params: { sigunguCd, bjdongCd, bun, ji, mtYn },
    bldResults,
    noFilterTest: {
      description: '필터 없이 아무 건물이나 1건 조회 (API 동작 확인용)',
      hasData: !!noFilterItem,
      item: noFilterItem ?? null,
    },
  })
}
