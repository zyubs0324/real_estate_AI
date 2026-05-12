/**
 * [DEV ONLY] Juso API 연동 테스트 — 원시 응답 포함
 * GET http://localhost:3000/api/dev/test-juso?q=서울강남구
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const q   = req.nextUrl.searchParams.get('q') ?? '테헤란로'
  const key = process.env.JUSO_API_KEY ?? ''

  const params = new URLSearchParams({
    currentPage:  '1',
    countPerPage: '5',
    keyword:      q,
    confmKey:     key,
    resultType:   'json',
  })

  const url = `https://www.juso.go.kr/addrlink/addrLinkApi.do?${params}`

  try {
    const res  = await fetch(url, {
      headers: {
        Referer: 'http://localhost:3000',
        Origin:  'http://localhost:3000',
      },
    })
    const json = await res.json()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.json({
      query:        q,
      httpStatus:   res.status,
      errorCode:    json?.results?.common?.errorCode,
      errorMessage: json?.results?.common?.errorMessage,
      totalCount:   json?.results?.common?.totalCount,
      count:        json?.results?.juso?.length ?? 0,
      first:        json?.results?.juso?.[0] ?? null,
      debug: {
        refererSent: appUrl,
        endpoint: `https://www.juso.go.kr/addrlink/addrLinkApi.do`,
        keyPrefix: key.substring(0, 10) + '...',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
