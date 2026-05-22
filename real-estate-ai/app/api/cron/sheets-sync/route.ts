import { NextResponse } from 'next/server'
import { syncGoogleSheet } from '@/lib/sheets/sync'

export async function GET() {
  const result = await syncGoogleSheet()
  return NextResponse.json(result, { status: result.ok ? 200 : 501 })
}
