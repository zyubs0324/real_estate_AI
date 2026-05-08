/**
 * GET /api/cron/notify
 * U3-8 — D-1 이메일 알림 발송
 *
 * 동작:
 *   1. schedules 테이블에서 내일 일정(is_done=false) 조회
 *   2. RESEND_API_KEY 있으면 Resend로 이메일 발송
 *   3. RESEND_API_KEY 없으면 콘솔 로그만 출력 (개발 모드)
 *
 * 수동 테스트:
 *   curl http://localhost:3000/api/cron/notify
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const NOTIFY_TO = process.env.NOTIFY_EMAIL ?? process.env.NEXT_PUBLIC_NOTIFY_EMAIL ?? ''

export async function GET(_req: NextRequest) {
  // ── 내일 날짜 범위 계산 ──────────────────────────────────
  const now       = new Date()
  const tomorrow  = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const tomorrowStart = new Date(tomorrow)
  tomorrowStart.setHours(0, 0, 0, 0)

  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setHours(23, 59, 59, 999)

  // ── D-1 일정 조회 ────────────────────────────────────────
  const supabase = await createServerSupabaseClient()
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('id, title, schedule_type, due_date, memo')
    .eq('is_done', false)
    .gte('due_date', tomorrowStart.toISOString())
    .lt('due_date', tomorrowEnd.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ sent: 0, message: '내일 예정 일정 없음' })
  }

  // ── 이메일 발송 ──────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    // 개발 환경: 콘솔 출력으로 대체
    console.log('[cron/notify] RESEND_API_KEY 미설정 — 발송 시뮬레이션')
    schedules.forEach((s) => {
      const dt = new Date(s.due_date as string).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      console.log(`  📅 [D-1] ${s.title} (${s.schedule_type}) — ${dt}`)
    })
    return NextResponse.json({ sent: schedules.length, mode: 'simulation' })
  }

  const resend = new Resend(apiKey)
  let sent = 0

  for (const schedule of schedules) {
    const dt   = new Date(schedule.due_date as string).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    const body = [
      `[부동산 AI] D-1 일정 알림`,
      ``,
      `제목: ${schedule.title}`,
      `유형: ${schedule.schedule_type}`,
      `일시: ${dt}`,
      schedule.memo ? `메모: ${schedule.memo}` : '',
    ].filter(Boolean).join('\n')

    try {
      await resend.emails.send({
        from:    'noreply@real-estate-ai.local',
        to:      NOTIFY_TO || 'admin@real-estate-ai.local',
        subject: `[D-1 알림] ${schedule.title}`,
        text:    body,
      })
      sent++
    } catch (err) {
      console.error('[cron/notify] 이메일 발송 실패:', err)
    }
  }

  return NextResponse.json({ sent })
}
