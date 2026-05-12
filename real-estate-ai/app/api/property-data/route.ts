/**
 * GET /api/property-data?sigunguCd=...&bjdongCd=...&bun=...&ji=...&platGbCd=...&bdMgtSn=...
 *
 * 건축물대장 + 등기부 + VWorld + 실거래가 4개 API를 서버사이드에서 병렬 조회.
 * 클라이언트에서 환경변수에 직접 접근할 수 없으므로 이 Route를 경유한다.
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchBuilding, type BuildingQuery } from '@/lib/apis/building'
import { fetchRegistry } from '@/lib/apis/registry'
import { fetchVWorld, buildPnu } from '@/lib/apis/vworld'
import { fetchRealPrice } from '@/lib/apis/realPrice'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams

  // 건축물대장용 파라미터 (buildingQueryFromJuso에서 유래)
  const sigunguCd = p.get('sigunguCd') ?? ''
  const bjdongCd  = p.get('bjdongCd')  ?? ''
  const bun       = p.get('bun')       ?? undefined
  const ji        = p.get('ji')        ?? undefined
  const platGbCd  = p.get('platGbCd') ?? undefined

  // 등기부 / VWorld / 실거래가용 파라미터
  const bdMgtSn      = p.get('bdMgtSn')      ?? ''
  const roadAddr     = p.get('roadAddr')     ?? ''
  const lnbrMnnm     = p.get('lnbrMnnm')     // 지번본번 (연립·오피스텔·단독 필터용)
  const buildingName = p.get('buildingName') ?? undefined  // 건물명 (아파트 aptNm 필터용)

  const buildingQuery: BuildingQuery | null = sigunguCd && bjdongCd
    ? { sigunguCd, bjdongCd, bun, ji, platGbCd }
    : null

  // VWorld PNU: Juso 파라미터로 명시적 구성 (bdMgtSn 내 대지구분이 다를 수 있음)
  const vworldPnu =
    sigunguCd && bjdongCd && bun
      ? buildPnu(sigunguCd + bjdongCd, platGbCd ?? '0', bun, ji ?? '0000')
      : undefined

  const [building, registry, vworld, deals] = await Promise.allSettled([
    buildingQuery ? fetchBuilding(buildingQuery) : Promise.resolve(null),
    fetchRegistry(bdMgtSn),
    fetchVWorld(bdMgtSn, { pnuOverride: vworldPnu, roadAddr: roadAddr || undefined }),
    fetchRealPrice(bdMgtSn, {
      lnbrMnnm:     lnbrMnnm    ? Number(lnbrMnnm) : undefined,
      buildingName: buildingName || undefined,
    }),
  ])

  return NextResponse.json({
    building: building.status === 'fulfilled' ? building.value : null,
    registry: registry.status === 'fulfilled' ? registry.value : null,
    vworld:   vworld.status   === 'fulfilled' ? vworld.value   : null,
    deals:    deals.status    === 'fulfilled' ? deals.value    : [],
  })
}
