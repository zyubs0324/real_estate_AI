'use client'

// apple.md §14 — 대시보드 카드 레이아웃
// U1-5: 6개 블록 뼈대
// U3-9: 실데이터 연결 (schedules / properties / transactions)

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import QuickAddressSearch from '@/components/dashboard/QuickAddressSearch'
import { listSchedules,    type ScheduleRow }    from '@/lib/supabase/schedules'
import { listProperties,   type PropertyRow }    from '@/lib/supabase/properties'
import { listTransactions, type TransactionRow } from '@/lib/supabase/transactions'

// ─── 유틸 ─────────────────────────────────────────────────
function shortAddr(addr: string): string {
  const parts = addr.trim().split(/\s+/)
  return parts.length > 2 ? parts.slice(-2).join(' ') : addr
}

function dDay(dateStr: string): string {
  const now  = new Date(); now.setHours(0, 0, 0, 0)
  const due  = new Date(dateStr); due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - now.getTime()) / 86_400_000)
  if (diff === 0) return 'D-Day'
  if (diff > 0)  return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

function fmtDate(str: string | null): string {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function fmtPrice(n: number | null): string {
  if (!n) return '—'
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000)      return `${(n / 10_000).toFixed(0)}만`
  return `${n.toLocaleString()}원`
}

// ─── 스타일 ────────────────────────────────────────────────
const S = {
  main: {
    flex: 1, overflowY: 'auto' as const, padding: '24px',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  },
  grid: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#ffffff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 24px',
  },
  cardTitle: {
    fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.48)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12,
  },
  emptyState: {
    display: 'flex' as const, flexDirection: 'column' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    padding: '24px 0', gap: 6,
  },
  emptyText: { fontSize: 14, color: 'rgba(0,0,0,0.35)', textAlign: 'center' as const },
  row: {
    display: 'flex' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, padding: '8px 0',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    fontSize: 13, color: '#1d1d1f', cursor: 'pointer' as const,
  },
  rowLast: {
    display: 'flex' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, padding: '8px 0',
    fontSize: 13, color: '#1d1d1f', cursor: 'pointer' as const,
  },
  badge: (color: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 7px', borderRadius: 6,
    fontSize: 11, fontWeight: 700,
    background: `${color}18`, color,
  }),
  dDayBadge: (diff: number): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700,
    color: diff <= 7 ? '#ff3b30' : diff <= 30 ? '#ff9f0a' : '#636366',
  }),
  statusCount: {
    display: 'flex' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, padding: '6px 0', fontSize: 13,
  },
}

const STATUS_COLOR: Record<string, string> = {
  '상담':     '#636366',
  '계약진행': '#0071e3',
  '계약완료': '#34c759',
  '잔금완료': '#34c759',
  '취소':     '#ff3b30',
}

const SCHED_TYPE_COLOR: Record<string, string> = {
  '계약': '#0071e3', '잔금': '#34c759',
  '현장미팅': '#ff9f0a', '서류': '#636366', '기타': '#636366',
}

// ─── 카드 래퍼 ──────────────────────────────────────────
function DashboardCard({ title, children, fullWidth }: {
  title: string; children: React.ReactNode; fullWidth?: boolean
}) {
  return (
    <div style={{ ...S.card, ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
      <p style={S.cardTitle}>{title}</p>
      {children}
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div style={S.emptyState}>
      <p style={S.emptyText}>{message}</p>
    </div>
  )
}

// ─── 페이지 ──────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()

  const [schedules,    setSchedules]    = useState<ScheduleRow[]>([])
  const [properties,   setProperties]   = useState<PropertyRow[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading,      setLoading]      = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p, t] = await Promise.all([
        listSchedules(),
        listProperties(),
        listTransactions(),
      ])
      setSchedules(s)
      setProperties(p)
      setTransactions(t)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── 파생 데이터 ──────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const in7   = new Date(today); in7.setDate(today.getDate() + 7)
  const in90  = new Date(today); in90.setDate(today.getDate() + 90)

  // D+7 이내 미완료 일정
  const upcomingSchedules = schedules.filter((s) => {
    if (s.is_done) return false
    const d = new Date(s.due_date)
    return d >= today && d <= in7
  })

  // 최근 매물 5개
  const recentProps = properties.slice(0, 5)

  // D-90 이내 만료 예정 거래 (전세·월세·단기임대)
  const expiringTx = transactions.filter((t) => {
    if (!t.end_date || t.status === '취소') return false
    const d = new Date(t.end_date)
    return d >= today && d <= in90
  }).sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())

  // 거래 현황 — 상태별 집계
  const txByStatus = transactions.reduce<Record<string, number>>((acc, t) => {
    if (t.status !== '취소') acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})

  // 수수료 미수령 (잔금완료 + commission_is_paid=false)
  // TransactionRow에 commission_is_paid가 없을 수 있어서 status로만 필터
  const unpaidTx = transactions.filter((t) => t.status === '잔금완료')

  if (loading) {
    return (
      <>
        <Header title="대시보드" />
        <main style={S.main}>
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(0,0,0,0.35)', fontSize: 14 }}>
            로딩 중…
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="대시보드" />
      <main style={S.main}>
        <div style={S.grid}>

          {/* 1. 빠른 주소 검색 */}
          <QuickAddressSearch />

          {/* 2. 오늘의 알림 — D+7 이내 일정 */}
          <DashboardCard title="오늘의 알림">
            {upcomingSchedules.length === 0 ? (
              <Empty message="7일 내 예정 일정이 없습니다" />
            ) : (
              upcomingSchedules.map((s, i) => {
                const diff = Math.round(
                  (new Date(s.due_date).setHours(0,0,0,0) - today.getTime()) / 86_400_000
                )
                const isLast = i === upcomingSchedules.length - 1
                return (
                  <div key={s.id} style={isLast ? S.rowLast : S.row}
                    onClick={() => router.push('/schedules')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: SCHED_TYPE_COLOR[s.schedule_type] ?? '#636366',
                        display: 'inline-block',
                      }} />
                      {s.title}
                    </span>
                    <span style={S.dDayBadge(diff)}>{dDay(s.due_date)}</span>
                  </div>
                )
              })
            )}
          </DashboardCard>

          {/* 3. 최근 매물 */}
          <DashboardCard title="최근 매물">
            {recentProps.length === 0 ? (
              <Empty message="등록된 매물이 없습니다" />
            ) : (
              recentProps.map((p, i) => {
                const isLast = i === recentProps.length - 1
                return (
                  <div key={p.id} style={isLast ? S.rowLast : S.row}
                    onClick={() => router.push('/properties')}>
                    <span>{shortAddr(p.road_address)}
                      {p.unit_number ? ` ${p.unit_number}` : ''}
                    </span>
                    <span style={S.badge(p.status === '공실' ? '#ff9f0a' : '#34c759')}>
                      {p.status}
                    </span>
                  </div>
                )
              })
            )}
          </DashboardCard>

          {/* 4. 계약 만료 임박 (D-90) */}
          <DashboardCard title="계약 만료 임박">
            {expiringTx.length === 0 ? (
              <Empty message="90일 내 만료 예정 없음" />
            ) : (
              expiringTx.map((t, i) => {
                const diff = Math.round(
                  (new Date(t.end_date!).setHours(0,0,0,0) - today.getTime()) / 86_400_000
                )
                const isLast = i === expiringTx.length - 1
                return (
                  <div key={t.id} style={isLast ? S.rowLast : S.row}
                    onClick={() => router.push('/transactions')}>
                    <span>{shortAddr(t.property_road_address)} · {t.deal_type}</span>
                    <span style={S.dDayBadge(diff)}>{`D-${diff}`}</span>
                  </div>
                )
              })
            )}
          </DashboardCard>

          {/* 5. 담당 거래 현황 */}
          <DashboardCard title="담당 거래 현황">
            {Object.keys(txByStatus).length === 0 ? (
              <Empty message="등록된 거래가 없습니다" />
            ) : (
              Object.entries(txByStatus).map(([status, count]) => (
                <div key={status} style={S.statusCount}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: STATUS_COLOR[status] ?? '#636366',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    {status}
                  </span>
                  <span style={{ fontWeight: 700 }}>{count}건</span>
                </div>
              ))
            )}
          </DashboardCard>

          {/* 6. 수수료 미수령 */}
          <DashboardCard title="수수료 미수령">
            {unpaidTx.length === 0 ? (
              <Empty message="미수령 수수료 없음" />
            ) : (
              unpaidTx.map((t, i) => {
                const isLast = i === unpaidTx.length - 1
                return (
                  <div key={t.id} style={isLast ? S.rowLast : S.row}
                    onClick={() => router.push('/transactions')}>
                    <span>{shortAddr(t.property_road_address)}</span>
                    <span style={{ fontWeight: 700, color: '#ff3b30' }}>
                      {fmtPrice(t.price)}
                    </span>
                  </div>
                )
              })
            )}
          </DashboardCard>

        </div>
      </main>
    </>
  )
}
