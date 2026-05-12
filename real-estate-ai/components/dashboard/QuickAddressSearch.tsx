'use client'

// apple.md §14 — 빠른 주소 검색 카드 (Client Component)
// U1-6: 대시보드 전용 래퍼
// U2-1: Quick Check, U2-5: 실거래가
// 재설계: 유형 라디오 → 주소 선택 → (공동주택) 동/호 선택 → 결과

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddressSearch from '@/components/address/AddressSearch'
import QuickCheck, { type QuickCheckResult } from '@/components/report/QuickCheck'
import type { JusoResult } from '@/lib/apis/juso'
import { buildingQueryFromJuso, type BuildingUnit } from '@/lib/apis/building'
import { toRiskItems, type RegistryResult } from '@/lib/apis/registry'
import type { RealPriceDeal } from '@/lib/apis/realPrice'
import { checkRegulations } from '@/lib/regulations'
import { saveDiagnostics } from '@/lib/supabase/diagnostics'

// ─── 부동산 유형 정의 ─────────────────────────────────────
type PropertyType = '아파트' | '오피스텔' | '단독다가구' | '빌라연립'
type DealTab      = '매매' | '전세' | '월세'

interface PropertyTypeConfig {
  label: PropertyType
  /**
   * Juso API bdKdcd 필터 ('0'|'1'|undefined).
   * 오피스텔은 Juso가 bdKdcd='0'(단독)으로 반환하는 사례가 많아
   * 필터 없이(undefined) 검색 후 건물명으로 구분한다.
   */
  bdKdcdFilter?: '0' | '1'
  needsUnit: boolean   // 동/호 Step 필요 여부
}

const PROPERTY_TYPES: PropertyTypeConfig[] = [
  { label: '아파트',    bdKdcdFilter: '1',       needsUnit: true  },
  { label: '오피스텔', bdKdcdFilter: undefined,  needsUnit: true  },  // bdKdcd 불일치 — 필터 없이 검색
  { label: '단독다가구', bdKdcdFilter: '0',      needsUnit: false },
  { label: '빌라연립',  bdKdcdFilter: '1',       needsUnit: true  },
]

const DEAL_TABS: DealTab[] = ['매매', '전세', '월세']

// ─── 스타일 ───────────────────────────────────────────────
const FONT = "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif"

const S = {
  card: {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
    padding: '20px 24px',
    gridColumn: '1 / -1' as const,
    fontFamily: FONT,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(0, 0, 0, 0.48)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 14,
  },
  // 라디오 버튼 그룹
  radioGroup: {
    display: 'flex' as const,
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap' as const,
  },
  radioBtn: (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 980,
    border: active ? 'none' : '1px solid rgba(0,0,0,0.14)',
    background: active ? '#0071e3' : '#f5f5f7',
    color: active ? '#ffffff' : 'rgba(0,0,0,0.65)',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    fontFamily: FONT,
    transition: 'all 0.15s',
  }),
  // 섹션 카드
  sectionCard: {
    marginTop: 12,
    padding: '14px 18px',
    background: '#f5f5f7',
    borderRadius: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(0,0,0,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 10,
  },
  // 로딩
  loading: {
    marginTop: 12,
    padding: '12px 18px',
    background: '#f5f5f7',
    borderRadius: 10,
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.4)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  // 호 선택 select
  unitSelect: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 14,
    color: '#1d1d1f',
    background: '#ffffff',
    fontFamily: FONT,
  },
  // 거래 탭
  tabRow: {
    display: 'flex' as const,
    gap: 4,
    background: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tabBtn: (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '5px 0',
    borderRadius: 6,
    border: 'none',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#1d1d1f' : 'rgba(0,0,0,0.45)',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    fontFamily: FONT,
    transition: 'all 0.12s',
  }),
  // 거래 행
  dealRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: '7px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  dealMeta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    lineHeight: 1.4,
  },
  dealPrice: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1d1d1f',
    whiteSpace: 'nowrap' as const,
  },
  // 버튼 영역
  btnRow: {
    marginTop: 16,
    display: 'flex' as const,
    justifyContent: 'flex-end' as const,
    gap: 8,
  },
  btnOutline: {
    background: '#ffffff',
    color: '#0071e3',
    border: '1px solid #0071e3',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: FONT,
  },
  btnPrimary: {
    background: '#0071e3',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: FONT,
  },
  emptyDeals: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.35)',
    textAlign: 'center' as const,
    padding: '12px 0',
  },
}

// ─── 금액 포매터 ──────────────────────────────────────────
function formatWon(won: number): string {
  if (won >= 100_000_000) {
    const eok = Math.floor(won / 100_000_000)
    const man = Math.floor((won % 100_000_000) / 10_000)
    return man > 0 ? `${eok}억 ${man.toLocaleString('ko-KR')}만원` : `${eok}억원`
  }
  return `${Math.floor(won / 10_000).toLocaleString('ko-KR')}만원`
}

function formatDealPrice(deal: RealPriceDeal): string {
  if (deal.dealType === '월세') {
    const deposit = formatWon(deal.dealAmount)
    const monthly = Math.floor(deal.monthlyRent / 10_000).toLocaleString('ko-KR')
    return `월세 ${monthly}만/${deposit}`
  }
  if (deal.dealType === '전세') return `전세 ${formatWon(deal.dealAmount)}`
  return formatWon(deal.dealAmount)
}

function parseDongNames(detBdNmList: string): string[] {
  return [...new Set(
    detBdNmList
      .split(/[,，、]/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0 && name.includes('동'))
  )].sort((a, b) => a.localeCompare(b, 'ko'))
}

// ─── 로딩 스피너 ─────────────────────────────────────────
function Spinner({ label }: { label: string }) {
  return (
    <div style={S.loading} aria-live="polite">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {label}
    </div>
  )
}

// ─── 거래 탭 섹션 ─────────────────────────────────────────
function DealSection({ deals, dealTab, setDealTab }: {
  deals: RealPriceDeal[]
  dealTab: DealTab
  setDealTab: (t: DealTab) => void
}) {
  const filtered = deals.filter((d) => d.dealType === dealTab).slice(0, 5)

  return (
    <div style={S.sectionCard} role="region" aria-label="최근 실거래가">
      <div style={S.sectionLabel}>최근 실거래가 (5년 이내)</div>

      {/* 탭 */}
      <div style={S.tabRow} role="tablist">
        {DEAL_TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={dealTab === tab}
            style={S.tabBtn(dealTab === tab)}
            onClick={() => setDealTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 거래 목록 */}
      {filtered.length === 0 ? (
        <div style={S.emptyDeals}>최근 5년 이내 {dealTab} 거래 없음</div>
      ) : (
        filtered.map((deal, idx) => (
          <div key={idx} style={{
            ...S.dealRow,
            borderBottom: idx === filtered.length - 1 ? 'none' : S.dealRow.borderBottom,
          }}>
            <div style={S.dealMeta}>
              {deal.dealYear}.{String(deal.dealMonth).padStart(2, '0')}.{String(deal.dealDay).padStart(2, '0')}
              {deal.buildingType !== '단독다가구' && deal.floor > 0 && ` · ${deal.floor}층`}
              {deal.area > 0 && ` · ${deal.area}㎡`}
              {deal.buildYear > 0 && ` · ${deal.buildYear}년`}
              {deal.dealingGbn && ` · ${deal.dealingGbn}`}
            </div>
            <div style={S.dealPrice}>{formatDealPrice(deal)}</div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────
export default function QuickAddressSearch() {
  const router = useRouter()

  // ── 상태 ──────────────────────────────────────────────
  const [propertyType,   setPropertyType]   = useState<PropertyType>('아파트')
  const [selectedAddr,   setSelectedAddr]   = useState<JusoResult | null>(null)
  const [units,          setUnits]          = useState<BuildingUnit[]>([])
  const [selectedDong,   setSelectedDong]   = useState<string>('')     // 선택한 동 ('' = 전체)
  const [selectedUnit,   setSelectedUnit]   = useState<BuildingUnit | null>(null)
  const [isLoadingUnits, setIsLoadingUnits] = useState(false)

  const [quickCheck,   setQuickCheck]   = useState<QuickCheckResult | null>(null)
  const [deals,        setDeals]        = useState<RealPriceDeal[]>([])
  const [isLoading,    setIsLoading]    = useState(false)
  const [fetchError,   setFetchError]   = useState(false)
  const [dealTab,      setDealTab]      = useState<DealTab>('매매')
  const cfg = PROPERTY_TYPES.find((c) => c.label === propertyType)!

  // ── 유형 변경 시 초기화 ────────────────────────────────
  function handleTypeChange(type: PropertyType) {
    setPropertyType(type)
    setSelectedAddr(null)
    setUnits([])
    setSelectedDong('')
    setSelectedUnit(null)
    setQuickCheck(null)
    setDeals([])
    setFetchError(false)
  }

  // ── Step 1: 주소 선택 ─────────────────────────────────
  async function handleAddressSelect(result: JusoResult) {
    setSelectedAddr(result)
    setUnits([])
    const jusoDongNames = parseDongNames(result.detBdNmList ?? '')
    setSelectedDong(jusoDongNames.length === 1 ? jusoDongNames[0] : '')
    setSelectedUnit(null)
    setQuickCheck(null)
    setDeals([])
    setFetchError(false)

    if (cfg.needsUnit) {
      // 공동주택: 동/호 목록을 먼저 가져온 후 사용자가 선택
      setIsLoadingUnits(true)
      try {
        const bq = buildingQueryFromJuso(result)
        const qs = new URLSearchParams({
          sigunguCd: bq.sigunguCd,
          bjdongCd:  bq.bjdongCd,
          ...(bq.bun              && { bun:              bq.bun }),
          ...(bq.ji               && { ji:               bq.ji }),
          ...(bq.bjdongCdFallback && { bjdongCdFallback: bq.bjdongCdFallback }),
        })
        const res  = await fetch(`/api/building-units?${qs}`)
        const data = await res.json() as { units: BuildingUnit[] }
        const fetchedUnits = data.units ?? []
        setUnits(fetchedUnits)

        if (fetchedUnits.length > 0) {
          const dongNames = [...new Set(fetchedUnits.map((u) => u.dongNm))].filter(Boolean)
          if (dongNames.length === 1) setSelectedDong(dongNames[0])
        }

        // 실거래가는 동/호가 아니라 주소·단지 기준으로 조회한다.
        // 동 선택은 호수 목록을 좁히는 UI 상태로만 사용한다.
        await fetchData(result, null)
      } catch (err) {
        console.error('[QuickAddressSearch] building-units 조회 실패:', err)
        setUnits([])
        // 호 목록 조회 실패해도 전체 주소 기준으로 조회 시도
        await fetchData(result, null)
      } finally {
        setIsLoadingUnits(false)
      }
    } else {
      // 단독다가구: 바로 데이터 조회
      await fetchData(result, null)
    }
  }

  // ── Step 2a (공동주택): 동 선택 ──────────────────────
  function handleDongSelect(dong: string) {
    setSelectedDong(dong)
    setSelectedUnit(null)   // 동 바꾸면 호 초기화
  }

  // ── Step 2b (공동주택): 호 선택 ───────────────────────
  function handleUnitSelect(unit: BuildingUnit | null) {
    setSelectedUnit(unit)
  }

  // 현재 선택된 동의 호 목록
  const matchingDongUnits = selectedDong
    ? units.filter((u) => u.dongNm === selectedDong)
    : units
  const hoList = selectedDong && matchingDongUnits.length > 0
    ? matchingDongUnits
    : units

  // ── 데이터 조회 ───────────────────────────────────────
  async function fetchData(addr: JusoResult, unit: BuildingUnit | null) {
    setIsLoading(true)
    setFetchError(false)
    try {
      const bq = buildingQueryFromJuso(addr)
      const qs = new URLSearchParams({
        sigunguCd: bq.sigunguCd,
        bjdongCd:  bq.bjdongCd,
        ...(bq.bun       && { bun:      bq.bun }),
        ...(bq.ji        && { ji:       bq.ji }),
        ...(bq.platGbCd  && { platGbCd: bq.platGbCd }),
        bdMgtSn:  addr.bdMgtSn,
        roadAddr: addr.roadAddr,
        lnbrMnnm: String(addr.lnbrMnnm),
        ...(addr.bdNm && { buildingName: addr.bdNm }),
      })

      const res  = await fetch(`/api/property-data?${qs}`)
      const data = await res.json() as {
        building: unknown
        registry: RegistryResult | null
        vworld:   unknown
        deals:    RealPriceDeal[]
      }

      const { registry: registryInfo, deals: priceDeals } = data

      setDeals(priceDeals ?? [])
      if (priceDeals.length > 0) {
        const tabCounts = {
          '매매': priceDeals.filter((d) => d.dealType === '매매').length,
          '전세': priceDeals.filter((d) => d.dealType === '전세').length,
          '월세': priceDeals.filter((d) => d.dealType === '월세').length,
        }
        const bestTab = (Object.entries(tabCounts) as [DealTab, number][])
          .sort(([, a], [, b]) => b - a)[0][0]
        setDealTab(bestTab)
      }

      // Quick Check 구성
      const riskItems = registryInfo ? toRiskItems(registryInfo) : []

      const regs = checkRegulations(addr.siNm, addr.sggNm, addr.emdNm)
      if (regs.isLandTransactionZone) riskItems.push({ label: '토지거래허가구역', level: 'warning' })
      if (regs.isSpeculativeZone)     riskItems.push({ label: '투기과열지구',     level: 'warning' })
      if (regs.isAdjustmentZone)      riskItems.push({ label: '조정대상지역',     level: 'warning' })

      const today = new Date().toISOString().slice(0, 10)
      setQuickCheck({ items: riskItems, checkedAt: today })

      // U2-4: 진단 결과 DB 저장 (백그라운드)
      saveDiagnostics({
        bdMgtSn:              addr.bdMgtSn,
        roadAddr:             addr.roadAddr,
        hasViolation:         false,
        hasMortgage:          registryInfo?.hasMortgage          ?? false,
        hasSeizure:           registryInfo?.hasSeizure           ?? false,
        hasAuction:           registryInfo?.hasAuction           ?? false,
        hasTrust:             registryInfo?.hasTrust             ?? false,
        hasLeaseRegistration: registryInfo?.hasLeaseRegistration ?? false,
        isSpeculativeZone:    regs.isSpeculativeZone,
        isAdjustmentZone:     regs.isAdjustmentZone,
        isLandTransactionZone: regs.isLandTransactionZone,
        riskItems,
      }).catch(() => {/* 저장 실패 무시 */})

    } catch {
      setFetchError(true)
    } finally {
      setIsLoading(false)
    }
  }

  // ── 버튼 핸들러 ───────────────────────────────────────
  function handleDetailReport() {
    if (!selectedAddr) return
    const q = new URLSearchParams({
      roadAddr:  selectedAddr.roadAddr,
      siNm:      selectedAddr.siNm,
      sggNm:     selectedAddr.sggNm,
      emdNm:     selectedAddr.emdNm,
      bdMgtSn:   selectedAddr.bdMgtSn,
      admCd:     selectedAddr.admCd,
      lnbrMnnm:  String(selectedAddr.lnbrMnnm),
      lnbrSlno:  String(selectedAddr.lnbrSlno),
      mtYn:      selectedAddr.mtYn,
      ...(selectedAddr.bdNm && { bdNm: selectedAddr.bdNm }),
    })
    router.push(`/report?${q.toString()}`)
  }

  function handleRegisterProperty() {
    if (!selectedAddr) return
    const q = new URLSearchParams({
      register:     '1',
      roadAddr:     selectedAddr.roadAddr,
      bdMgtSn:      selectedAddr.bdMgtSn,
      admCd:        selectedAddr.admCd,
      lnbrMnnm:     String(selectedAddr.lnbrMnnm),
      lnbrSlno:     String(selectedAddr.lnbrSlno),
      mtYn:         selectedAddr.mtYn,
      propertyType,
      ...(selectedAddr.bdNm && { bdNm: selectedAddr.bdNm }),
      ...(selectedDong && { dong: selectedDong }),
      // ho(호)만 전달하여 form에서 단독 입력으로 처리
      ...(selectedUnit?.ho && { ho: selectedUnit.ho }),
    })
    router.push(`/properties?${q.toString()}`)
  }

  // ── 렌더 ──────────────────────────────────────────────
  const showResults  = !isLoading && (quickCheck !== null || deals.length > 0)
  // 데이터 조회가 완료(성공·실패 무관)됐으면 버튼 표시
  const hasFetched   = quickCheck !== null || deals.length > 0 || fetchError
  const showBtnRow   = !isLoading && selectedAddr !== null && hasFetched

  return (
    <div style={S.card}>
      <p style={S.cardTitle}>빠른 주소 검색</p>

      {/* Step 0: 부동산 유형 선택 */}
      <div style={S.radioGroup} role="group" aria-label="부동산 유형 선택">
        {PROPERTY_TYPES.map(({ label }) => (
          <button
            key={label}
            style={S.radioBtn(propertyType === label)}
            onClick={() => handleTypeChange(label)}
            aria-pressed={propertyType === label}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step 1: 주소 검색 */}
      <AddressSearch
        onSelect={handleAddressSelect}
        bdKdcdFilter={cfg.bdKdcdFilter}
        placeholder={`${propertyType} 주소 입력 (예: 성동구 옥수)`}
      />

      {/* Step 2: 동/호 선택 (공동주택만) */}
      {cfg.needsUnit && selectedAddr && (
        <>
          {isLoadingUnits && <Spinner label="호 목록 조회 중…" />}

          {!isLoadingUnits && units.length > 0 && (() => {
            // 동 목록 추출 (빈 문자열 = 단동, 값 있으면 멀티동)
            const unitDongList = [...new Set(units.map((u) => u.dongNm))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko'))
            const jusoDongList = selectedAddr ? parseDongNames(selectedAddr.detBdNmList ?? '') : []
            const dongList = unitDongList.length > 0 ? unitDongList : jusoDongList
            const isMultiDong = dongList.length > 1
            const shouldShowDong = dongList.length > 0

            return (
              <div style={{ ...S.sectionCard, marginTop: 10 }}>
                <div style={S.sectionLabel}>
                  호 선택 — 건축물대장 기준 ({units.length}개)
                </div>

                {/* 동 선택/표시 */}
                {shouldShowDong && (
                  <>
                    <div style={{ ...S.sectionLabel, marginBottom: 6 }}>동 선택</div>
                    {isMultiDong ? (
                      <select
                        style={{ ...S.unitSelect, marginBottom: 8 }}
                        value={selectedDong}
                        onChange={(e) => void handleDongSelect(e.target.value)}
                        aria-label="동 선택"
                      >
                        <option value="">동 선택 (전체)</option>
                        {dongList.map((dong) => (
                          <option key={dong} value={dong}>{dong}</option>
                        ))}
                      </select>
                    ) : (
                      <div style={{
                        ...S.unitSelect,
                        marginBottom: 8,
                        background: '#ffffff',
                        fontWeight: 600,
                      }}>
                        {selectedDong || dongList[0]}
                      </div>
                    )}
                  </>
                )}

                {/* 호 선택 */}
                <select
                  style={S.unitSelect}
                  value={selectedUnit ? `${selectedUnit.dongNm}|${selectedUnit.ho}` : ''}
                  onChange={(e) => {
                    const val   = e.target.value
                    if (!val) { void handleUnitSelect(null); return }
                    const [dong, ho] = val.split('|')
                    const found = hoList.find((u) => u.dongNm === dong && u.ho === ho) ?? null
                    void handleUnitSelect(found)
                  }}
                  aria-label="호 선택"
                >
                  <option value="">호 선택 (전체 조회)</option>
                  {hoList.map((u) => (
                    <option key={`${u.dongNm}|${u.ho}`} value={`${u.dongNm}|${u.ho}`}>
                      {u.ho}호 · {u.area}㎡ · {u.flrNo}층
                    </option>
                  ))}
                </select>

                {!selectedUnit && (
                  <button
                    style={{ ...S.btnOutline, marginTop: 8, width: '100%', textAlign: 'center' }}
                    onClick={() => void handleUnitSelect(null)}
                  >
                    전체 조회하기
                  </button>
                )}
              </div>
            )
          })()}

          {!isLoadingUnits && units.length === 0 && (() => {
            const jusoDongList = selectedAddr ? parseDongNames(selectedAddr.detBdNmList ?? '') : []
            if (jusoDongList.length === 0) return null
            const isMultiDong = jusoDongList.length > 1

            return (
              <div style={{ ...S.sectionCard, marginTop: 10 }}>
                <div style={S.sectionLabel}>동 선택 — 도로명주소 기준</div>
                {isMultiDong ? (
                  <select
                    style={S.unitSelect}
                    value={selectedDong}
                    onChange={(e) => void handleDongSelect(e.target.value)}
                    aria-label="동 선택"
                  >
                    <option value="">동 선택</option>
                    {jusoDongList.map((dong) => (
                      <option key={dong} value={dong}>{dong}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ ...S.unitSelect, background: '#ffffff', fontWeight: 600 }}>
                    {selectedDong || jusoDongList[0]}
                  </div>
                )}
              </div>
            )
          })()}

          {/* 호 목록 없음: 자동으로 전체 주소 기준 조회 진행 중 — 별도 메시지 불필요 */}
        </>
      )}

      {/* 데이터 로딩 */}
      {isLoading && <Spinner label="조회 중…" />}

      {/* 조회 오류 */}
      {!isLoading && fetchError && (
        <div style={{ ...S.sectionCard, marginTop: 12, fontSize: 13, color: '#ff3b30' }}
          role="alert">
          조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      {/* Quick Check 결과 */}
      {showResults && (
        <>
          <QuickCheck result={quickCheck} />
          <DealSection
            deals={deals}
            dealTab={dealTab}
            setDealTab={setDealTab}
          />
        </>
      )}

      {/* 하단 버튼 */}
      {showBtnRow && (
        <div style={S.btnRow}>
          <button style={S.btnOutline} onClick={handleRegisterProperty}>
            매물로 등록
          </button>
          <button style={S.btnPrimary} onClick={handleDetailReport}>
            상세 진단 보기 →
          </button>
        </div>
      )}
    </div>
  )
}
