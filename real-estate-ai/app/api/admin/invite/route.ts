/**
 * POST /api/admin/invite
 * Supabase inviteUserByEmail — 서비스 롤 키 필요
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email: string }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '올바른 이메일을 입력하세요.' }, { status: 400 })
  }

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase 서비스 키가 설정되지 않았습니다.' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.auth.admin.inviteUserByEmail(email)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
