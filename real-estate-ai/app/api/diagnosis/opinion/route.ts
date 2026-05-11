/**
 * POST /api/diagnosis/opinion
 * 서버사이드에서 Claude AI로 진단 종합 의견 생성
 * (클라이언트 컴포넌트에서 ANTHROPIC_API_KEY 미접근 문제 해결)
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateDiagnosisOpinionClaude } from '@/lib/claude-ai'
import type { DiagnosisInput } from '@/lib/github-ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as DiagnosisInput

    if (!body.address) {
      return NextResponse.json({ error: '주소가 필요합니다.' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ opinion: null }, { status: 200 })
    }

    const opinion = await generateDiagnosisOpinionClaude(body)
    return NextResponse.json({ opinion })
  } catch {
    return NextResponse.json({ opinion: null }, { status: 200 })
  }
}
