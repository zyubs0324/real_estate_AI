/**
 * [DEV ONLY] 건축물대장 파라미터 진단 엔드포인트
 *
 * 주어진 sigunguCd + bjdongCd + bun + ji + platGbCd 로
 * 여러 파라미터 조합을 시도해 어떤 것이 데이터를 반환하는지 확인한다.
 *
 * 사용 예:
 *   GET /api/dev/diagnose-building?sigunguCd=11170&bjdongCd=13100&bun=0810&ji=0000&platGbCd=1
 */
import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://apis.data.go.kr/1613000/BldRgstHubService'

interface TrialResult {
  params:      Record<string, string>
  totalCount:  number
  firstItem:   Record<string, unknown> | null
  endpoint:    string
}

async function tryEndpoint(
  endpoint: string,
  apiKey: string,
  params: Record<string, string>,
): Promise<TrialResult> {
  const qs = new URLSearchParams({ ...params, numOfRows: '3', pageNo: '1' })
  const url = `${BASE}/${endpoint}?serviceKey=${apiKey}&${qs}`

  try {
    const res  = await fetch(url, { cache: 'no-store' })
    const txt  = await res.text()
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true })
    const data   = parser.parse(txt) as Record<string, unknown>
    const body   = (data?.response as Record<string, unknown>)?.body as Record<string, unknown>
    const raw    = (body?.items as Record<string, unknown>)?.item
    const items: Record<string, unknown>[] = !raw ? [] : Array.isArray(raw)
      ? raw as Record<string, unknown>[]
      : [raw as Record<string, unknown>]
    const totalCount = Number(body?.totalCount ?? 0)

    return { params, totalCount, firstItem: items[0] ?? null, endpoint }
  } catch (err) {
    return { params, totalCount: -1, firstItem: { error: String(err) }, endpoint }
  }
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev only' }, { status: 403 })
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY ?? ''
  if (!apiKey) return NextResponse.json({ error: 'DATA_GO_KR_API_KEY 없음' }, { status: 500 })

  const p = req.nextUrl.searchParams
  const sigunguCd = p.get('sigunguCd') ?? '11170'
  const bjdongCd  = p.get('bjdongCd')  ?? '13100'
  const bun       = p.get('bun')       ?? '0810'
  const ji        = p.get('ji')        ?? '0000'
  const platGbCd  = p.get('platGbCd') ?? '1'

  const base    = { sigunguCd, bjdongCd }
  const withBun = { ...base, bun, ji }
  const withAll = { ...withBun, platGbCd }

  const bjdong2 = bjdongCd === '13100' ? '10700' : bjdongCd  // 행정동 vs 법정동 시도

  const trials: Array<{ endpoint: string; params: Record<string, string> }> = [
    // ── 총괄표제부 ────────────────────────────────────────────
    { endpoint: 'getBrRecapTitleInfo', params: withAll },
    { endpoint: 'getBrRecapTitleInfo', params: withBun },
    { endpoint: 'getBrRecapTitleInfo', params: { ...withBun, platGbCd: '0' } },
    { endpoint: 'getBrRecapTitleInfo', params: { sigunguCd, bjdongCd: bjdong2, bun, ji } },

    // ── 표제부 ────────────────────────────────────────────────
    { endpoint: 'getBrTitleInfo',       params: withAll },
    { endpoint: 'getBrTitleInfo',       params: withBun },
    { endpoint: 'getBrTitleInfo',       params: { ...withBun, platGbCd: '0' } },
    { endpoint: 'getBrTitleInfo',       params: { sigunguCd, bjdongCd: bjdong2, bun, ji } },

    // ── 전유공용면적 (호 목록) ────────────────────────────────
    { endpoint: 'getBrExposPubuseAreaInfo', params: withAll },
    { endpoint: 'getBrExposPubuseAreaInfo', params: withBun },                        // platGbCd 제거
    { endpoint: 'getBrExposPubuseAreaInfo', params: { ...withBun, platGbCd: '0' } }, // 대지로 시도
    { endpoint: 'getBrExposPubuseAreaInfo', params: { sigunguCd, bjdongCd: bjdong2, bun, ji } }, // bjdong2 시도
    { endpoint: 'getBrExposPubuseAreaInfo', params: { sigunguCd, bjdongCd: bjdong2, bun, ji, platGbCd: '0' } },
  ]

  const results = await Promise.all(
    trials.map(({ endpoint, params }) => tryEndpoint(endpoint, apiKey, params)),
  )

  // 데이터가 있는 것들만 앞으로
  const sorted = [...results].sort((a, b) => (b.totalCount > 0 ? 1 : 0) - (a.totalCount > 0 ? 1 : 0))

  return NextResponse.json({
    입력파라미터: { sigunguCd, bjdongCd, bun, ji, platGbCd },
    요약: sorted.map((r) => ({
      엔드포인트: r.endpoint,
      파라미터:   r.params,
      총건수:     r.totalCount,
      데이터있음: r.totalCount > 0,
    })),
    상세: sorted,
  }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
