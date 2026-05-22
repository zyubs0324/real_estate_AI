/**
 * GET /api/building-units
 *
 * 건축물대장 전유부 호 목록 서버사이드 프록시.
 * DATA_GO_KR_API_KEY 는 서버 전용 환경변수이므로 클라이언트에서 직접 접근 불가.
 *
 * 요청 파라미터:
 *   sigunguCd  — 시군구코드 5자리 (필수)
 *   bjdongCd   — 법정동코드 5자리 (필수)
 *   bun        — 번 4자리 (옵션)
 *   ji         — 지 4자리 (옵션)
 *   platGbCd   — 대지구분코드 (옵션)
 *
 * 응답:
 *   { units: BuildingUnit[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchBuildingUnits, type BuildingQuery } from '@/lib/apis/building'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams

  const sigunguCd        = p.get('sigunguCd')        ?? ''
  const bjdongCd         = p.get('bjdongCd')         ?? ''
  const bun              = p.get('bun')              ?? undefined
  const ji               = p.get('ji')               ?? undefined
  const platGbCd         = p.get('platGbCd')        ?? undefined
  const bjdongCdFallback = p.get('bjdongCdFallback') ?? undefined

  if (!sigunguCd || !bjdongCd) {
    return NextResponse.json({ units: [] }, { status: 400 })
  }

  const query: BuildingQuery = { sigunguCd, bjdongCd, bun, ji, platGbCd, bjdongCdFallback }

  // [DEV] 호출 파라미터 서버 로그 — Next.js 터미널에서 확인 가능
  if (process.env.NODE_ENV !== 'production') {
    const hasKey  = !!process.env.DATA_GO_KR_API_KEY
    const isMock  = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'
    const bdMgtSn = p.get('bdMgtSn') // 디버그용: 원본 bdMgtSn 확인
    console.log(
      `[building-units] 조회 파라미터: ${JSON.stringify(query)}`,
      `| API키: ${hasKey ? 'O' : 'X(없음→빈배열반환)'}`,
      `| Mock: ${isMock}`,
      bjdongCdFallback ? `| 폴백bjdong: ${bjdongCdFallback}` : '',
    )
  }

  try {
    const units = await fetchBuildingUnits(query)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[building-units] 결과: ${units.length}건`)
    }
    // 프로덕션: 건축물대장 데이터는 자주 바뀌지 않으므로 1시간 캐시
    // 개발: 캐시 비활성화 — 코드 변경 즉시 반영
    const cacheHeader = process.env.NODE_ENV === 'production'
      ? 'public, max-age=3600, stale-while-revalidate=86400'
      : 'no-store'
    return NextResponse.json({ units }, {
      headers: { 'Cache-Control': cacheHeader },
    })
  } catch (err) {
    console.error('[building-units] fetchBuildingUnits 실패:', err)
    return NextResponse.json({ units: [], error: 'upstream_error' }, { status: 502 })
  }
}
