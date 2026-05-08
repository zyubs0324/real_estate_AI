'use client'

// apple.md §14 — 빠른 주소 검색 카드 (Client Component)
// U1-6: 대시보드 전용 래퍼
// U1-7: 건축물대장, U2-1: Quick Check, U2-5: 용도지역·실거래가

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddressSearch from '@/components/address/AddressSearch'
import QuickCheck, { type QuickCheckResult } from '@/components/report/QuickCheck'
import type { JusoResult } from '@/lib/apis/juso'
import { fetchBuilding, type BuildingResult } from '@/lib/apis/building'
import { fetchRegistry, toRiskItems } from '@/lib/apis/registry'
import { fetchVWorld, type VWorldResult } from '@/lib/apis/vworld'
import { fetchRealPrice, type RealPriceDeal } from '@/lib/apis/realPrice'
import { checkRegulations } from '@/lib/regulations'
import { saveDiagnostics } from '@/lib/supabase/diagnostics'

const S = {
  card: {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
    padding: '20px 24px',
    gridColumn: '1 / -1' as const,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(0, 0, 0, 0.48)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 12,
  },
  buildingCard: {
    marginTop: 16,
    padding: '16px 20px',
    background: '#f5f5f7',
    borderRadius: 10,
  },
  buildingTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1d1d1f',
    marginBottom: 12,
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  violationBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#ffffff',
    background: '#ff3b30',
    borderRadius: 4,
    padding: '2px 7px',
  },
  grid: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '10px 20px',
  },
  field: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 2,
  },
  label: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.4)',
    fontWeight: 500,
  },
  value: {
    fontSize: 14,
    color: '#1d1d1f',
    fontWeight: 500,
  },
  loading: {
    marginTop: 16,
    padding: '14px 20px',
    background: '#f5f5f7',
    borderRadius: 10,
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.4)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
}

function BuildingInfoCard({ info }: { info: BuildingResult }) {
  const floorText = info.undergroundFloor > 0
    ? `지상 ${info.groundFloor}층 / 지하 ${info.undergroundFloor}층`
    : `지상 ${info.groundFloor}층`

  const areaText = `${info.totalFloorArea.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} ㎡`

  return (
    <div style={S.buildingCard} role="region" aria-label="건축물 정보">
      <div style={S.buildingTitle}>
        {info.buildingName || '(건물명 없음)'}
        {info.isViolation && (
          <span style={S.violationBadge} aria-label="위반건축물">위반건축물</span>
        )}
      </div>
      <div style={S.grid}>
        <div style={S.field}>
          <span style={S.label}>주용도</span>
          <span style={S.value}>{info.mainPurpose || '—'}</span>
        </div>
        <div style={S.field}>
          <span style={S.label}>연면적</span>
          <span style={S.value}>{areaText}</span>
        </div>
        <div style={S.field}>
          <span style={S.label}>층수</span>
          <span style={S.value}>{floorText}</span>
        </div>
        <div style={S.field}>
          <span style={S.label}>사용승인일</span>
          <span style={S.value}>{info.approvalDate || '—'}</span>
        </div>
      </div>
    </div>
  )
}

export default function QuickAddressSearch() {
  const router = useRouter()
  const [building, setBuilding] = useState<BuildingResult | null>(null)
  const [quickCheck, setQuickCheck] = useState<QuickCheckResult | null>(null)
  const [vworld, setVworld] = useState<VWorldResult | null>(null)
  const [deals, setDeals] = useState<RealPriceDeal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAddr, setSelectedAddr] = useState<JusoResult | null>(null)

  async function handleSelect(result: JusoResult) {
    setSelectedAddr(result)
    setBuilding(null)
    setQuickCheck(null)
    setVworld(null)
    setDeals([])
    setIsLoading(true)
    try {
      // 4개 API 병렬 조회
      const [buildingInfo, registryInfo, vworldInfo, priceDeals] = await Promise.all([
        fetchBuilding(result.bdMgtSn),
        fetchRegistry(result.bdMgtSn),
        fetchVWorld(result.bdMgtSn),
        fetchRealPrice(result.bdMgtSn),
      ])

      setVworld(vworldInfo)
      setDeals(priceDeals)

      setBuilding(buildingInfo)

      // 등기부 위험 태그
      const riskItems = registryInfo ? toRiskItems(registryInfo) : []

      // 위반건축물 (건축물대장)
      if (buildingInfo?.isViolation) {
        riskItems.unshift({ label: '위반건축물', level: 'danger' })
      }

      // 규제지역 판별 (행정구역명 기반)
      const regs = checkRegulations(result.siNm, result.sggNm, result.emdNm)
      if (regs.isLandTransactionZone) {
        riskItems.push({ label: '토지거래허가구역', level: 'warning' })
      }
      if (regs.isSpeculativeZone) {
        riskItems.push({ label: '투기과열지구', level: 'warning' })
      }
      if (regs.isAdjustmentZone) {
        riskItems.push({ label: '조정대상지역', level: 'warning' })
      }

      const today = new Date().toISOString().slice(0, 10)
      setQuickCheck({ items: riskItems, checkedAt: today })

      // U2-4: 진단 결과 DB 저장 (백그라운드, 실패해도 UI에 영향 없음)
      saveDiagnostics({
        bdMgtSn: result.bdMgtSn,
        roadAddr: result.roadAddr,
        hasViolation: buildingInfo?.isViolation ?? false,
        hasMortgage: registryInfo?.hasMortgage ?? false,
        hasSeizure: registryInfo?.hasSeizure ?? false,
        hasAuction: registryInfo?.hasAuction ?? false,
        hasTrust: registryInfo?.hasTrust ?? false,
        hasLeaseRegistration: registryInfo?.hasLeaseRegistration ?? false,
        isSpeculativeZone: regs.isSpeculativeZone,
        isAdjustmentZone: regs.isAdjustmentZone,
        isLandTransactionZone: regs.isLandTransactionZone,
        riskItems,
      }).catch(() => {/* 저장 실패는 무시 */})
    } catch {
      setBuilding(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={S.card}>
      <p style={S.cardTitle}>빠른 주소 검색</p>
      <AddressSearch onSelect={handleSelect} />

      {isLoading && (
        <div style={S.loading} aria-live="polite">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ animation: 'spin 1s linear infinite' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          건축물대장 조회 중…
        </div>
      )}

      {!isLoading && building && (
        <BuildingInfoCard info={building} />
      )}

      {!isLoading && quickCheck && (
        <QuickCheck result={quickCheck} />
      )}

      {!isLoading && vworld && (
        <div style={{ ...S.buildingCard, marginTop: 8 }} role="region" aria-label="용도지역 정보">
          <div style={S.grid}>
            <div style={S.field}>
              <span style={S.label}>용도지역</span>
              <span style={S.value}>{vworld.landUseZone}</span>
            </div>
            <div style={S.field}>
              <span style={S.label}>공시지가 ({vworld.pricedAt})</span>
              <span style={S.value}>
                {vworld.officialLandPrice.toLocaleString('ko-KR')} 원/㎡
              </span>
            </div>
          </div>
        </div>
      )}

      {!isLoading && deals.length > 0 && (
        <div style={{ ...S.buildingCard, marginTop: 8 }} role="region" aria-label="실거래가">
          <div style={{ ...S.label, marginBottom: 10 }}>최근 실거래가</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {deals.slice(0, 3).map((deal, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' as const, alignItems: 'center' as const }}>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)' }}>
                  {deal.dealYear}.{String(deal.dealMonth).padStart(2, '0')} · {deal.area}㎡ · {deal.floor}층
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
                  {formatAmount(deal.dealAmount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상세 진단 보기 버튼 — 주소 선택 후 표시 */}
      {!isLoading && selectedAddr && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' as const }}>
          <button
            onClick={() => {
              const q = new URLSearchParams({
                bdMgtSn:  selectedAddr.bdMgtSn,
                roadAddr: selectedAddr.roadAddr,
                siNm:     selectedAddr.siNm,
                sggNm:    selectedAddr.sggNm,
                emdNm:    selectedAddr.emdNm,
              })
              router.push(`/report?${q.toString()}`)
            }}
            style={{
              background: '#0071e3',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
            }}
          >
            상세 진단 보기 →
          </button>
        </div>
      )}
    </div>
  )
}

function formatAmount(won: number): string {
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000)
    const man = Math.floor((won % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString('ko-KR')}만원` : `${eok}억원`
  }
  return `${Math.floor(won / 10000).toLocaleString('ko-KR')}만원`
}
