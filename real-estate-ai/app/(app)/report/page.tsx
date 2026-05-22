'use client'

// apple.md §14 — 진단 리포트 페이지
// U2-6: A~G 섹션 카드 레이아웃
// 리포트 한계 고지 필수

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import QuickCheck, { type QuickCheckResult } from '@/components/report/QuickCheck'
import RiskBadge from '@/components/report/RiskBadge'
import { buildingQueryFromJuso, type BuildingResult } from '@/lib/apis/building'
import { toRiskItems, type RegistryResult } from '@/lib/apis/registry'
import type { VWorldResult } from '@/lib/apis/vworld'
import type { RealPriceDeal } from '@/lib/apis/realPrice'
import { checkRegulations, type RegulationResult } from '@/lib/regulations'
import { saveDiagnostics } from '@/lib/supabase/diagnostics'
import { listReportHistory, saveReportHistory, type ReportHistoryRow } from '@/lib/supabase/reportHistory'

// ─── 스타일 ────────────────────────────────────────────────
const S = {
  main: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    maxWidth: 860,
  },
  addrBar: {
    marginBottom: 20,
    padding: '12px 16px',
    background: '#ffffff',
    borderRadius: 10,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    fontSize: 15,
    color: '#1d1d1f',
    fontWeight: 600,
  },
  addrSub: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
    fontWeight: 400,
    marginTop: 2,
  },
  section: {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '20px 24px',
    marginBottom: 12,
  },
  sectionHeader: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    background: '#0071e3',
    borderRadius: 4,
    padding: '2px 7px',
    letterSpacing: '0.04em',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1d1d1f',
  },
  grid2: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px 20px',
  },
  field: { display: 'flex' as const, flexDirection: 'column' as const, gap: 3 },
  label: { fontSize: 11, color: 'rgba(0,0,0,0.4)', fontWeight: 500 },
  value: { fontSize: 14, color: '#1d1d1f', fontWeight: 500 },
  badges: { display: 'flex' as const, flexWrap: 'wrap' as const, gap: 6 },
  dealRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: '8px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  dealMeta: { fontSize: 13, color: 'rgba(0,0,0,0.5)' },
  dealAmount: { fontSize: 14, fontWeight: 600, color: '#1d1d1f' },
  deferred: {
    padding: '24px',
    background: '#f5f5f7',
    borderRadius: 10,
    textAlign: 'center' as const,
  },
  deferredText: { fontSize: 14, color: 'rgba(0,0,0,0.4)', marginBottom: 8 },
  deferredBadge: {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 600,
    color: '#636366',
    background: 'rgba(0,0,0,0.08)',
    borderRadius: 6,
    padding: '3px 10px',
  },
  legalNotice: {
    marginTop: 20,
    padding: '14px 18px',
    background: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
    lineHeight: 1.7,
  },
  loading: {
    padding: '60px 0',
    textAlign: 'center' as const,
    fontSize: 14,
    color: 'rgba(0,0,0,0.4)',
  },
  historyList: {
    display: 'grid' as const,
    gap: 8,
  },
  historyButton: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 10,
    background: '#ffffff',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  historyAddress: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1d1d1f',
    marginBottom: 4,
  },
  historyMeta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
  },
}

// ─── 유틸 ────────────────────────────────────────────────
function formatWon(won: number): string {
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000)
    const man = Math.floor((won % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString('ko-KR')}만원` : `${eok}억원`
  }
  return `${Math.floor(won / 10000).toLocaleString('ko-KR')}만원`
}

function formatDealPrice(deal: RealPriceDeal): string {
  if (deal.dealType === '월세') {
    const monthly = Math.floor(deal.monthlyRent / 10000).toLocaleString('ko-KR')
    return `월세 ${monthly}만 / 보증 ${formatWon(deal.dealAmount)}`
  }
  if (deal.dealType === '전세') {
    return `전세 ${formatWon(deal.dealAmount)}`
  }
  return formatWon(deal.dealAmount)
}

function dealTypeColor(dealType: string): string {
  if (dealType === '전세') return '#0071e3'
  if (dealType === '월세') return '#ff9f0a'
  return '#1d1d1f'
}

// ─── 섹션 레이블 ─────────────────────────────────────────
function SectionHead({ label, title }: { label: string; title: string }) {
  return (
    <div style={S.sectionHeader}>
      <span style={S.sectionLabel}>{label}</span>
      <span style={S.sectionTitle}>{title}</span>
    </div>
  )
}

function summarizeQuickCheck(result: QuickCheckResult | null): string {
  if (!result?.items?.length) return '특이사항 없음'
  return result.items.map((item) => item.label).join(', ')
}

// ─── 페이지 ──────────────────────────────────────────────
export default function ReportPage() {
  return (
    <Suspense fallback={
      <>
        <Header title="진단 리포트" />
        <main style={S.main}><div style={S.loading}>불러오는 중…</div></main>
      </>
    }>
      <ReportContent />
    </Suspense>
  )
}

function ReportContent() {
  const params = useSearchParams()
  const bdMgtSn      = params.get('bdMgtSn')      ?? ''
  const roadAddr     = params.get('roadAddr')     ?? ''
  const bdNm         = params.get('bdNm')         ?? ''   // 건물명 (아파트 aptNm 필터용)
  const siNm         = params.get('siNm')         ?? ''
  const sggNm    = params.get('sggNm')    ?? ''
  const emdNm    = params.get('emdNm')    ?? ''
  const admCd    = params.get('admCd')    ?? ''
  const lnbrMnnm = params.get('lnbrMnnm') ?? '0'
  const lnbrSlno = params.get('lnbrSlno') ?? '0'
  const mtYn     = params.get('mtYn')     ?? '0'

  const hasAddr = !!(bdMgtSn || admCd)
  const [isLoading, setIsLoading] = useState(hasAddr)
  const [building,  setBuilding]  = useState<BuildingResult | null>(null)
  const [registry,  setRegistry]  = useState<RegistryResult | null>(null)
  const [vworld,    setVworld]    = useState<VWorldResult | null>(null)
  const [deals,     setDeals]     = useState<RealPriceDeal[]>([])
  const [regs,      setRegs]      = useState<RegulationResult | null>(null)
  const [quickCheck, setQuickCheck] = useState<QuickCheckResult | null>(null)
  const [aiOpinion,  setAiOpinion]  = useState<string | null>(null)
  const [aiLoading,  setAiLoading]  = useState(false)
  const [history, setHistory] = useState<ReportHistoryRow[]>([])
  const savedHistoryKey = useRef<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listReportHistory(20))
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  function restoreHistory(row: ReportHistoryRow) {
    const data = row.report_data
    setBuilding((data.building ?? null) as BuildingResult | null)
    setRegistry((data.registry ?? null) as RegistryResult | null)
    setVworld((data.vworld ?? null) as VWorldResult | null)
    setDeals((data.deals ?? []) as RealPriceDeal[])
    setRegs((data.regs ?? null) as RegulationResult | null)
    setQuickCheck((data.quickCheck ?? null) as QuickCheckResult | null)
    setAiOpinion((data.aiOpinion ?? null) as string | null)
    setAiLoading(false)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!hasAddr) return

    setIsLoading(true)

    // 4개 API 서버사이드 프록시 경유 (클라이언트에서 env var 접근 불가)
    const bq = admCd
      ? buildingQueryFromJuso({ admCd, lnbrMnnm: Number(lnbrMnnm), lnbrSlno: Number(lnbrSlno), mtYn })
      : null

    const qs = new URLSearchParams({ bdMgtSn })
    if (roadAddr)  qs.set('roadAddr',     roadAddr)
    if (lnbrMnnm) qs.set('lnbrMnnm',    lnbrMnnm)
    if (bdNm)     qs.set('buildingName', bdNm)
    if (bq) {
      qs.set('sigunguCd', bq.sigunguCd)
      qs.set('bjdongCd',  bq.bjdongCd)
      if (bq.bun)      qs.set('bun',      bq.bun)
      if (bq.ji)       qs.set('ji',       bq.ji)
      if (bq.platGbCd) qs.set('platGbCd', bq.platGbCd)
    }

    fetch(`/api/property-data?${qs}`)
      .then((res) => res.json() as Promise<{
        building: BuildingResult | null
        registry: RegistryResult | null
        vworld:   VWorldResult   | null
        deals:    RealPriceDeal[]
      }>)
      .then(({ building: b, registry: r, vworld: v, deals: d }) => {
      setBuilding(b)
      setRegistry(r)
      setVworld(v)
      setDeals(d)

      const reg = checkRegulations(siNm, sggNm, emdNm)
      setRegs(reg)

      const riskItems = r ? toRiskItems(r) : []
      if (b?.isViolation) riskItems.unshift({ label: '위반건축물', level: 'danger' })
      if (reg.isLandTransactionZone) riskItems.push({ label: '토지거래허가구역', level: 'warning' })
      if (reg.isSpeculativeZone)     riskItems.push({ label: '투기과열지구',      level: 'warning' })
      if (reg.isAdjustmentZone)      riskItems.push({ label: '조정대상지역',       level: 'warning' })

      const today = new Date().toISOString().slice(0, 10)
      const quick = { items: riskItems, checkedAt: today }
      setQuickCheck(quick)

      saveDiagnostics({
        bdMgtSn: bdMgtSn || admCd, roadAddr,
        hasViolation: b?.isViolation ?? false,
        hasMortgage:  r?.hasMortgage ?? false,
        hasSeizure:   r?.hasSeizure  ?? false,
        hasAuction:   r?.hasAuction  ?? false,
        hasTrust:     r?.hasTrust    ?? false,
        hasLeaseRegistration: r?.hasLeaseRegistration ?? false,
        isSpeculativeZone:    reg.isSpeculativeZone,
        isAdjustmentZone:     reg.isAdjustmentZone,
        isLandTransactionZone: reg.isLandTransactionZone,
        riskItems,
      }).catch(() => {})

      // U4-3: AI 종합 의견 생성 — 서버 API 라우트 경유 (GITHUB_TOKEN 서버사이드 접근)
      const buildingSummary = b
        ? `${b.mainPurpose} / 지상 ${b.groundFloor}층 / 준공 ${b.approvalDate?.slice(0, 4) ?? '미상'}년`
        : undefined
      const regulationParts = [
        reg.isAdjustmentZone      ? '조정대상지역 해당' : '',
        reg.isSpeculativeZone     ? '투기과열지구 해당' : '',
        reg.isLandTransactionZone ? '토지거래허가구역 해당' : '',
      ].filter(Boolean)
      const regulationSummary = regulationParts.length > 0 ? regulationParts.join(', ') : undefined

      setAiLoading(true)
      fetch('/api/diagnosis/opinion', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ address: roadAddr, riskItems, buildingSummary, regulationSummary }),
      })
        .then((res) => res.json())
        .then(({ opinion }) => opinion ?? null)
        .catch(() => null)
        .then((opinion) => {
          setAiOpinion(opinion)

          const historyKey = `${bdMgtSn || admCd}:${roadAddr}`
          if (savedHistoryKey.current === historyKey) return
          savedHistoryKey.current = historyKey

          saveReportHistory({
            road_address: roadAddr,
            bd_mgt_sn: bdMgtSn || admCd,
            report_data: {
              building: b,
              registry: r,
              vworld: v,
              deals: d,
              regs: reg,
              quickCheck: quick,
              aiOpinion: opinion,
            },
            quick_check_summary: summarizeQuickCheck(quick),
          })
            .then(() => loadHistory())
            .catch(() => {})
        })
        .finally(() => setAiLoading(false))
    }).finally(() => setIsLoading(false))
  }, [bdMgtSn, admCd]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasAddr) {
    return (
      <>
        <Header title="진단 리포트" />
        <main style={S.main}>
          <div style={S.loading}>주소를 선택하면 진단 리포트가 표시됩니다</div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="진단 리포트" />
      <main style={S.main}>

        {/* 주소 표시 */}
        <div style={S.addrBar}>
          {roadAddr}
          <div style={S.addrSub}>{new Date().toISOString().slice(0, 10)} 기준</div>
        </div>

        {history.length > 0 && (
          <div style={S.section}>
            <SectionHead label="H" title="리포트 이력" />
            <div style={S.historyList}>
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  style={S.historyButton}
                  onClick={() => restoreHistory(item)}
                >
                  <div style={S.historyAddress}>{item.road_address}</div>
                  <div style={S.historyMeta}>
                    {new Date(item.created_at).toLocaleString('ko-KR')} · {item.quick_check_summary ?? '요약 없음'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={S.loading}>데이터를 불러오는 중…</div>
        ) : (
          <>
            {/* A: Quick Check */}
            <div style={S.section} data-testid="section-a">
              <SectionHead label="A" title="Quick Check" />
              <QuickCheck result={quickCheck} />
            </div>

            {/* B: 권리관계 */}
            <div style={S.section} data-testid="section-b">
              <SectionHead label="B" title="권리관계 분석" />
              {registry ? (
                <div style={S.grid2}>
                  {[
                    { label: '근저당', value: registry.hasMortgage ? `설정 (${(registry.mortgageAmount / 100000000).toFixed(1)}억)` : '없음' },
                    { label: '압류',   value: registry.hasSeizure  ? '있음' : '없음' },
                    { label: '경매',   value: registry.hasAuction  ? '있음' : '없음' },
                    { label: '신탁',   value: registry.hasTrust    ? '있음' : '없음' },
                    { label: '임차권등기', value: registry.hasLeaseRegistration ? '있음' : '없음' },
                  ].map(({ label, value }) => (
                    <div key={label} style={S.field}>
                      <span style={S.label}>{label}</span>
                      <span style={{ ...S.value, color: value !== '없음' ? '#ff3b30' : '#1d1d1f' }}>{value}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={S.label}>데이터 없음</div>}
            </div>

            {/* C: 건축물 현황 */}
            <div style={S.section} data-testid="section-c">
              <SectionHead label="C" title="건축물 현황" />
              {building ? (
                <div style={S.grid2}>
                  {[
                    { label: '건물명',     value: building.buildingName || '—' },
                    { label: '주용도',     value: building.mainPurpose  || '—' },
                    { label: '연면적',     value: `${building.totalFloorArea.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} ㎡` },
                    { label: '층수',       value: building.undergroundFloor > 0 ? `지상 ${building.groundFloor}층 / 지하 ${building.undergroundFloor}층` : `지상 ${building.groundFloor}층` },
                    { label: '사용승인일', value: building.approvalDate || '—' },
                    { label: '위반건축물', value: building.isViolation ? '위반' : '해당없음' },
                  ].map(({ label, value }) => (
                    <div key={label} style={S.field}>
                      <span style={S.label}>{label}</span>
                      <span style={{ ...S.value, color: label === '위반건축물' && value === '위반' ? '#ff3b30' : '#1d1d1f' }}>{value}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={S.label}>데이터 없음</div>}
            </div>

            {/* D: 규제지역 */}
            <div style={S.section} data-testid="section-d">
              <SectionHead label="D" title="규제지역" />
              {regs ? (
                <div style={S.badges}>
                  {regs.isLandTransactionZone && <RiskBadge level="warning" label="토지거래허가구역" />}
                  {regs.isSpeculativeZone      && <RiskBadge level="warning" label="투기과열지구" />}
                  {regs.isAdjustmentZone       && <RiskBadge level="warning" label="조정대상지역" />}
                  {!regs.isLandTransactionZone && !regs.isSpeculativeZone && !regs.isAdjustmentZone && (
                    <RiskBadge level="safe" label="규제지역 아님" />
                  )}
                </div>
              ) : <div style={S.label}>데이터 없음</div>}
            </div>

            {/* E: 토지·용도지역 */}
            <div style={S.section}>
              <SectionHead label="E" title="토지·용도지역" />
              {vworld ? (
                <div style={S.grid2}>
                  <div style={S.field}>
                    <span style={S.label}>용도지역</span>
                    <span style={S.value}>{vworld.landUseZone}</span>
                  </div>
                  <div style={S.field}>
                    <span style={S.label}>공시지가 ({vworld.pricedAt})</span>
                    <span style={S.value}>{vworld.officialLandPrice.toLocaleString('ko-KR')} 원/㎡</span>
                  </div>
                </div>
              ) : <div style={S.label}>데이터 없음</div>}
            </div>

            {/* F: 실거래가 */}
            <div style={S.section}>
              <SectionHead label="F" title="실거래가" />
              {deals.length > 0 ? (
                <div>
                  {deals.slice(0, 5).map((deal, idx) => (
                    <div key={idx} style={{ ...S.dealRow, ...(idx === deals.length - 1 || idx === 4 ? { borderBottom: 'none' } : {}) }}>
                      <div>
                        <div style={{ ...S.dealAmount, color: dealTypeColor(deal.dealType) }}>
                          {formatDealPrice(deal)}
                        </div>
                        <div style={S.dealMeta}>
                          {deal.dealYear}.{String(deal.dealMonth).padStart(2, '0')}.{String(deal.dealDay).padStart(2, '0')} · {deal.buildingType} · {deal.area}㎡ · {deal.floor}층 · {deal.dealType}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={S.label}>거래 데이터 없음</div>}
            </div>

            {/* G: AI 종합 의견 — U4-3 활성화 (GitHub Models gpt-4o) */}
            <div style={S.section}>
              <SectionHead label="G" title="AI 종합 의견" />
              {aiLoading ? (
                <div style={S.deferred}>
                  <div style={S.deferredText}>AI가 진단 항목을 분석하는 중입니다…</div>
                </div>
              ) : aiOpinion ? (
                <div style={{
                  padding: '16px 20px',
                  background: '#f5f5f7',
                  borderRadius: 10,
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: '#1d1d1f',
                  whiteSpace: 'pre-wrap' as const,
                }}>
                  {aiOpinion}
                </div>
              ) : (
                <div style={S.label}>AI 의견을 생성하지 못했습니다</div>
              )}
            </div>

            {/* 리포트 한계 고지 — 필수 */}
            <div style={S.legalNotice} role="note" aria-label="리포트 한계 고지">
              ⚠️ 본 리포트는 참고용 정보로, 법적 효력이 없습니다.<br />
              등기부등본·건축물대장은 개별 호수별로 다를 수 있으며, 반드시 원본 서류를 확인하시기 바랍니다.<br />
              규제지역 정보는 고시 기준이며 변경될 수 있습니다. 중요한 거래 전에는 전문가 상담을 권장합니다.
            </div>
          </>
        )}
      </main>
    </>
  )
}
