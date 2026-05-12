/**
 * GET /api/juso?q=검색어
 * 서버사이드 Juso API 프록시 — JUSO_API_KEY 서버 전용 환경변수 접근
 * 클라이언트에서 직접 외부 API를 호출하면 env 접근 불가 → 이 Route 경유
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchJuso } from '@/lib/apis/juso'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  try {
    const results = await fetchJuso(q)
    return NextResponse.json(results)
  } catch (e) {
    return NextResponse.json([], { status: 200 })  // 실패해도 빈 배열 반환 (UX 보호)
  }
}
