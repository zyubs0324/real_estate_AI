import { NextResponse } from 'next/server'
import { parsePropertyUrl } from '@/lib/parsers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (typeof body.url !== 'string' || body.url.trim() === '') {
      return NextResponse.json({ ok: false, error: 'url is required' }, { status: 400 })
    }

    const result = await parsePropertyUrl(body.url.trim())
    return NextResponse.json(result, { status: result.ok ? 200 : 422 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }
}
