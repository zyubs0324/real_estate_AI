/**
 * POST /api/quick-check
 * U3-3: 매물 등록 후 비동기 Quick Check 실행
 */
import { NextRequest, NextResponse } from 'next/server'
import { runQuickCheck } from '@/lib/quickCheck'
// RiskItem 타입은 lib/quickCheck.ts 내부에서 사용

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    bdMgtSn   = '',
    admCd     = '',
    lnbrMnnm  = '0',
    lnbrSlno  = '0',
    mtYn      = '0',
    roadAddr  = '',
    siNm      = '',
    sggNm     = '',
    emdNm     = '',
  } = body

  if (!bdMgtSn && !admCd) {
    return NextResponse.json({ error: 'bdMgtSn or admCd is required' }, { status: 400 })
  }

  const result = await runQuickCheck({
    bdMgtSn, admCd,
    lnbrMnnm: Number(lnbrMnnm),
    lnbrSlno: Number(lnbrSlno),
    mtYn,
    roadAddr, siNm, sggNm, emdNm,
  })
  return NextResponse.json(result)
}
