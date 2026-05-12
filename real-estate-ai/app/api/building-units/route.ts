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

  const sigunguCd = p.get('sigunguCd') ?? ''
  const bjdongCd  = p.get('bjdongCd')  ?? ''
  const bun       = p.get('bun')       ?? undefined
  const ji        = p.get('ji')        ?? undefined
  const platGbCd  = p.get('platGbCd') ?? undefined

  if (!sigunguCd || !bjdongCd) {
    return NextResponse.json({ units: [] }, { status: 400 })
  }

  const query: BuildingQuery = { sigunguCd, bjdongCd, bun, ji, platGbCd }

  try {
    const units = await fetchBuildingUnits(query)
    return NextResponse.json({ units })
  } catch (err) {
    console.error('[building-units] fetchBuildingUnits 실패:', err)
    return NextResponse.json({ units: [], error: 'upstream_error' }, { status: 502 })
  }
}
