/**
 * POST /api/diagnosis/opinion
 * 서버사이드에서 generateDiagnosisOpinion 호출 (GITHUB_TOKEN 접근 가능)
 * report/page.tsx ('use client')에서 직접 호출 시 process.env 미접근 문제 해결
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateDiagnosisOpinion, type DiagnosisInput } from '@/lib/github-ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as DiagnosisInput

    if (!body.address) {
      return NextResponse.json({ error: '주소가 필요합니다.' }, { status: 400 })
    }

    const opinion = await generateDiagnosisOpinion(body)
    return NextResponse.json({ opinion })
  } catch {
    return NextResponse.json({ opinion: null }, { status: 200 })
  }
}
