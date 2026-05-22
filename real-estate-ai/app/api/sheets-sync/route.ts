import { NextResponse } from 'next/server'
import { syncGoogleSheet } from '@/lib/sheets/sync'

export async function GET() {
  return NextResponse.json({
    ok: true,
    ready: Boolean(process.env.GOOGLE_SHEETS_CREDENTIALS && process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SHEET_RANGE),
  })
}

export async function POST() {
  const result = await syncGoogleSheet()
  return NextResponse.json(result, { status: result.ok ? 200 : 501 })
}
