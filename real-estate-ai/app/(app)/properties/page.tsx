'use client'

// apple.md §14 — 매물 리스트 페이지
// U3-1: 탭 필터 + 빈 상태
// U3-2: 매물 등록 폼 + DB 저장
// U3-4: 슬라이드 패널

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import AddressSearch from '@/components/address/AddressSearch'
import SearchInput from '@/components/common/SearchInput'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import SortableHeader from '@/components/common/SortableHeader'
import type { JusoResult } from '@/lib/apis/juso'
import { fetchBuilding, fetchBuildingUnits, buildingQueryFromJuso, type BuildingUnit } from '@/lib/apis/building'
import { saveProperty, listProperties, updateProperty, deleteProperty, updatePropertyLabels, getPropertyMemos, addPropertyMemo, deletePropertyMemo, type PropertyRow, type SavePropertyPayload, type PropertyMemoRow } from '@/lib/supabase/properties'
import { listPropertyCoBrokers, addPropertyCoBroker, removePropertyCoBroker, type PropertyAgencyRow } from '@/lib/supabase/propertyAgencies'
import { searchAgencies, type AgencyRow } from '@/lib/supabase/agencies'
import PropertyPhotoUploader from '@/components/properties/PropertyPhotoUploader'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { PhotoMeta } from '@/lib/supabase/propertyPhotos'
import { useDebounce } from '@/lib/hooks/useDebounce'
import MemoSection, { type MemoSavePayload } from '@/components/common/MemoSection'
import { isRegisteredDateInRange, normalizeRegisteredDate, registeredDateInputValue } from '@/lib/property/dateNormalizer'
import { findDuplicatePropertyIds } from '@/lib/property/propertyDuplicate'
import { compareDate, compareNumber, compareText, parseKoreanPrice, parseNumberText, type SortState } from '@/lib/table/sort'

// ─── 타입 ─────────────────────────────────────────────────
type TabKey = 'all' | 'ours' | 'interest' | 'focus' | 'exclusive' | 'strategic'

interface Tab {
  key: TabKey
  label: string
}

type PropertySortKey =
  | 'registeredDate'
  | 'handling'
  | 'address'
  | 'category'
  | 'alias'
  | 'dong'
  | 'unit'
  | 'adLevel'
  | 'dealType'
  | 'price'
  | 'area'
  | 'owner'
  | 'phone'
  | 'carrier'
  | 'hanjari'
  | 'deohill'
  | 'moveIn'
  | 'direction'
  | 'maintenance'

// ─── 상수 ─────────────────────────────────────────────────
const TABS: Tab[] = [
  { key: 'all',      label: '전체' },
  { key: 'ours',     label: '우리매물' },
  { key: 'interest', label: '관심매물' },
  { key: 'focus',    label: '집중관리' },
  { key: 'exclusive', label: '전속매물' },
  { key: 'strategic', label: '전략매물' },
]

// 건물유형은 건축물대장 API 원문 저장 — 상수 목록 미사용
const DEAL_TYPES     = ['매매', '전세', '월세', '단기임대']
const STATUS_OPTIONS = ['공실', '임대중', '매매완료', '중개진행중']

// ─── 스타일 ────────────────────────────────────────────────
const S = {
  main: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  },
  toolbar: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  tabGroup: {
    display: 'flex' as const,
    gap: 4,
    background: '#f5f5f7',
    borderRadius: 10,
    padding: 4,
  },
  tab: (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#1d1d1f' : 'rgba(0,0,0,0.5)',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  }),
  actions: {
    display: 'flex' as const,
    gap: 8,
    alignItems: 'center' as const,
  },
  select: {
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 13,
    color: '#1d1d1f',
    background: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  addBtn: {
    padding: '7px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#0071e3',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  card: {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '20px 24px',
  },
  empty: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: '80px 0',
    gap: 12,
  },
  emptyIcon:  { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1d1d1f' },
  emptyDesc:  { fontSize: 13, color: 'rgba(0,0,0,0.4)', textAlign: 'center' as const, lineHeight: 1.6 },
  emptyBtn:   {
    marginTop: 8,
    padding: '9px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#0071e3',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  // 슬라이드 패널
  panelOverlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 90,
  },
  panel: (open: boolean): React.CSSProperties => ({
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: 360,
    background: '#ffffff',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
    zIndex: 91,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  }),
  panelHeader: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '18px 20px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  panelTitle: { fontSize: 15, fontWeight: 700, color: '#1d1d1f' },
  closeBtn: {
    width: 28, height: 28,
    border: 'none', background: 'transparent',
    cursor: 'pointer', fontSize: 18, color: 'rgba(0,0,0,0.4)',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    borderRadius: 6,
  },
  panelBody: { flex: 1, overflowY: 'auto' as const, padding: '20px' },
  panelSection: { marginBottom: 20 },
  panelLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)', marginBottom: 6 },
  panelValue: { fontSize: 14, color: '#1d1d1f', fontWeight: 500 },
  panelGrid: {
    display: 'grid' as const,
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 16px',
  },
  labelChip: (active: boolean): React.CSSProperties => ({
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 5,
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? '#0071e3' : '#f5f5f7',
    color: active ? '#ffffff' : 'rgba(0,0,0,0.5)',
    fontFamily: 'inherit',
  }),
  panelFooter: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    display: 'flex' as const,
    gap: 8,
  },
  reportBtn: {
    flex: 1,
    padding: '9px 0',
    borderRadius: 8,
    border: '1px solid #0071e3',
    background: '#ffffff',
    color: '#0071e3',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center' as const,
  },
  // 테이블
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  tableScroll: {
    overflow: 'auto' as const,
    width: '100%',
    maxHeight: 'calc(100vh - 300px)',
    scrollbarGutter: 'stable' as const,
  },
  th: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 2,
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(0,0,0,0.4)',
    background: '#ffffff',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    color: '#1d1d1f',
    whiteSpace: 'nowrap' as const,
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  warningBadge: {
    display: 'inline-block', fontSize: 11, fontWeight: 700,
    padding: '2px 7px', borderRadius: 6,
    background: '#ff3b3018', color: '#ff3b30',
  } as React.CSSProperties,
  // 모달 오버레이
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 100,
  },
  modal: {
    background: '#ffffff',
    borderRadius: 16,
    padding: '28px 32px',
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: 20 },
  formField:  { marginBottom: 16 },
  label: {
    display: 'block' as const,
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(0,0,0,0.5)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 14,
    color: '#1d1d1f',
    background: '#f5f5f7',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  formSelect: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 14,
    color: '#1d1d1f',
    background: '#ffffff',
    fontFamily: 'inherit',
  },
  addrDisplay: {
    padding: '9px 12px',
    borderRadius: 8,
    background: '#f5f5f7',
    fontSize: 13,
    color: '#1d1d1f',
    minHeight: 38,
  },
  modalFooter: {
    display: 'flex' as const,
    justifyContent: 'flex-end' as const,
    gap: 8,
    marginTop: 24,
  },
  cancelBtn: {
    padding: '9px 18px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    background: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '9px 22px',
    borderRadius: 8,
    border: 'none',
    background: '#0071e3',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}

// ─── 빈 상태 메시지 ──────────────────────────────────────
const EMPTY_MSG: Record<TabKey, { title: string; desc: string }> = {
  all:      { title: '등록된 매물이 없습니다',   desc: '새 매물을 등록하면 여기에 표시됩니다.' },
  ours:     { title: '등록된 매물이 없습니다',   desc: '우리 사무소가 직접 등록한 매물이 없습니다.' },
  interest: { title: '관심 매물이 없습니다',     desc: '관심 표시한 매물이 여기에 표시됩니다.' },
  focus:    { title: '집중관리 매물이 없습니다', desc: '집중관리로 지정한 매물이 여기에 표시됩니다.' },
  exclusive: { title: '전속매물이 없습니다', desc: '전속 플래그가 지정된 매물이 여기에 표시됩니다.' },
  strategic: { title: '전략매물이 없습니다', desc: '전략매물 플래그가 지정된 매물이 여기에 표시됩니다.' },
}

// ─── 매물 등록 폼 ────────────────────────────────────────

/** 빠른 주소 검색에서 전달된 사전 입력 데이터 */
export interface PropertyFormPrefill {
  roadAddr:     string
  bdMgtSn:      string
  admCd:        string
  lnbrMnnm:     string
  lnbrSlno:     string
  mtYn:         string
  bdNm?:        string
  dong?:        string
  ho?:          string
  propertyType?: string
}

interface ParsedUrlProperty {
  source_platform: SavePropertyPayload['source_platform']
  source_url: string
  source_external_id?: string
  source_complex_id?: string
  road_address?: string
  building_name?: string
  deal_type?: string
  price_text?: string
  area_text?: string
  description?: string
}

interface PropertyFormProps {
  onClose:   () => void
  onSaved:   () => void
  prefill?:  PropertyFormPrefill
  editData?: PropertyRow
}

type BldTypeSource = 'idle' | 'loading' | 'api' | 'manual'
type UnitSource    = 'idle' | 'loading' | 'list' | 'text'

const ACTUAL_DONG_RE = new RegExp(`^(?:\\d+|[A-Za-z])\\s*\\uB3D9$`, 'i')
const HO_SUFFIX = '\uD638'

function parseDongNames(detBdNmList: string): string[] {
  return [...new Set(
    detBdNmList
      .split(/[,，、]/)
      .map((name) => name.trim())
      .filter((name) => ACTUAL_DONG_RE.test(name))
  )].sort((a, b) => a.localeCompare(b, 'ko'))
}

function unitLabel(ho: string): string {
  const value = ho.trim()
  return value.endsWith(HO_SUFFIX) ? value : `${value}${HO_SUFFIX}`
}

function unitValue(unit: BuildingUnit): string {
  return `${unit.dongNm}|${unit.ho}`
}

function PropertyForm({ onClose, onSaved, prefill, editData }: PropertyFormProps) {
  // prefill이 있으면 JusoResult와 유사한 구조로 초기화
  const initAddr: JusoResult | null = prefill || editData ? {
    roadAddr:      prefill?.roadAddr ?? editData?.road_address ?? '',
    roadAddrPart1: prefill?.roadAddr ?? editData?.road_address ?? '',
    jibunAddr:     editData?.jibun_address ?? '',
    zipNo:         '',
    admCd:         prefill?.admCd ?? '',
    rnMgtSn:       '',
    bdMgtSn:       prefill?.bdMgtSn ?? '',
    detBdNmList:   prefill?.dong ?? editData?.building_dong ?? '',
    bdNm:          prefill?.bdNm ?? editData?.building_name ?? '',
    bdKdcd:        '',
    siNm:          '',
    sggNm:         '',
    emdNm:         '',
    liNm:          '',
    rn:            '',
    udrtYn:        '',
    buldMnnm:      0,
    buldSlno:      0,
    mtYn:          prefill?.mtYn ?? '0',
    lnbrMnnm:      Number(prefill?.lnbrMnnm ?? 0),
    lnbrSlno:      Number(prefill?.lnbrSlno ?? 0),
    emdNo:         '',
  } : null

  const [addr,          setAddr]          = useState<JusoResult | null>(initAddr)
  const [bldType,       setBldType]       = useState(prefill?.propertyType ?? editData?.building_type ?? '')
  const [bldTypeSource, setBldTypeSource] = useState<BldTypeSource>(prefill?.propertyType ? 'api' : 'idle')
  const [dong,          setDong]          = useState(prefill?.dong ?? editData?.building_dong ?? '')
  const [units,         setUnits]         = useState<BuildingUnit[]>([])
  const [unitSource,    setUnitSource]    = useState<UnitSource>(prefill?.ho ? 'text' : 'idle')
  const [unit,          setUnit]          = useState(prefill?.ho ? `${prefill.ho}호` : editData?.unit_number ?? '')
  const [deal,          setDeal]          = useState(editData?.deal_type ?? '')
  const [status,        setStatus]        = useState(editData?.status ?? '공실')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const unitDongNames = [...new Set(units.map((u) => u.dongNm).filter((name) => ACTUAL_DONG_RE.test(name)))]
    .sort((a, b) => a.localeCompare(b, 'ko'))
  const filteredUnits = dong ? units.filter((u) => u.dongNm === dong) : units
  const selectedUnitValue = (() => {
    if (!unit) return ''
    const found = filteredUnits.find((u) => unitLabel(u.ho) === unit)
    return found ? unitValue(found) : ''
  })()

  async function handleAddressSelect(r: JusoResult) {
    setAddr(r)
    setDong('')
    // 호수 초기화
    setUnit('')
    setUnits([])
    setUnitSource('idle')
    // 건물유형 초기화 후 API 조회
    setBldType('')
    setBldTypeSource('loading')

    try {
      // 표제부(건물유형)와 전유부(호수 목록) 병렬 조회
      const bq = buildingQueryFromJuso(r)
      const [bldResult, unitList] = await Promise.all([
        fetchBuilding(bq),
        fetchBuildingUnits(bq),
      ])

      // 건물유형 — API 원문 그대로 저장 (매핑 없음)
      if (bldResult?.mainPurpose) {
        setBldType(bldResult.mainPurpose)
        setBldTypeSource('api')
      } else {
        setBldTypeSource('manual')
      }

      // 호수 목록
      if (unitList.length > 0) {
        setUnits(unitList)
        const dongNames = [...new Set(unitList.map((u) => u.dongNm).filter((name) => ACTUAL_DONG_RE.test(name)))]
        if (dongNames.length === 1) setDong(dongNames[0])
        setUnitSource('list')
      } else {
        const jusoDongNames = parseDongNames(r.detBdNmList ?? '')
        if (jusoDongNames.length === 1) setDong(jusoDongNames[0])
        setUnitSource('text')
      }
    } catch {
      setBldTypeSource('manual')
      setUnitSource('text')
    }
  }

  async function handleSave() {
    if (!addr) { setError('주소를 선택해 주세요.'); return }
    setSaving(true)
    setError('')
    try {
      const payload: SavePropertyPayload = {
        road_address:    addr.roadAddr,
        jibun_address:   addr.jibunAddr,
        building_name:   addr.bdNm  || undefined,
        building_dong:   dong       || undefined,
        unit_number:     unit       || undefined,
        building_type:   bldType    || undefined,
        deal_type:       deal       || undefined,
        status,
        is_our_property: true,
      }
      if (editData) await updateProperty(editData.id, payload)
      else await saveProperty(payload)

      // U3-3: Quick Check 백그라운드 자동 실행 (실패해도 저장에 영향 없음)
      if (!editData) fetch('/api/quick-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bdMgtSn:   addr.bdMgtSn,
          admCd:     addr.admCd,
          lnbrMnnm:  addr.lnbrMnnm,
          lnbrSlno:  addr.lnbrSlno,
          mtYn:      addr.mtYn,
          roadAddr:  addr.roadAddr,
          siNm:      addr.siNm,
          sggNm:     addr.sggNm,
          emdNm:     addr.emdNm,
        }),
      }).catch(() => {/* Quick Check 실패는 무시 */})

      onSaved()
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal} data-testid="property-form">
        <div style={S.modalTitle}>{editData ? '매물 수정' : '매물 등록'}</div>

        {/* 주소 검색 */}
        <div style={S.formField}>
          <span style={S.label}>주소 *</span>
          <AddressSearch onSelect={handleAddressSelect} />
          {addr && (
            <div style={{ ...S.addrDisplay, marginTop: 8 }}>
              {addr.roadAddr}
            </div>
          )}
        </div>

        {/* 건물유형 — 건축물대장 원문 자동 조회 */}
        <div style={S.formField}>
          <label htmlFor="bld-type" style={S.label}>건물유형</label>

          {bldTypeSource === 'loading' && (
            <div style={{ ...S.addrDisplay, color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>
              건축물대장 조회 중…
            </div>
          )}

          {bldTypeSource === 'api' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ ...S.addrDisplay, flex: 1, fontWeight: 600 }}>
                {bldType}
              </div>
              <span style={{ fontSize: 11, color: '#34c759', whiteSpace: 'nowrap' }}>
                건축물대장 자동 조회 ✓
              </span>
            </div>
          )}

          {(bldTypeSource === 'idle' || bldTypeSource === 'manual') && (
            <>
              {bldTypeSource === 'manual' && (
                <div style={{ fontSize: 11, color: '#ff9f0a', marginBottom: 4 }}>
                  자동 조회 실패 — 직접 입력하세요
                </div>
              )}
              <input
                id="bld-type"
                aria-label="건물유형"
                style={S.input}
                type="text"
                placeholder="예: 공동주택(아파트), 오피스텔, 근린생활시설"
                value={bldType}
                onChange={(e) => setBldType(e.target.value)}
              />
            </>
          )}
        </div>

        {/* 동 — 전유부 목록이 있으면 실제 동만 선택 */}
        {unitSource === 'list' && unitDongNames.length > 1 && (
          <div style={S.formField}>
            <label htmlFor="building-dong" style={S.label}>동</label>
            <select
              id="building-dong"
              aria-label="동"
              style={S.formSelect}
              value={dong}
              onChange={(e) => {
                setDong(e.target.value)
                setUnit('')
              }}
            >
              <option value="">전체</option>
              {unitDongNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {dong && !(unitSource === 'list' && unitDongNames.length > 1) && (
          <div style={S.formField}>
            <label style={S.label}>동</label>
            <div style={{ ...S.addrDisplay, fontWeight: 600 }}>
              {dong}
            </div>
          </div>
        )}

        {/* 거래유형 */}
        <div style={S.formField}>
          <label htmlFor="deal-type" style={S.label}>거래유형</label>
          <select
            id="deal-type"
            aria-label="거래유형"
            style={S.formSelect}
            value={deal}
            onChange={(e) => setDeal(e.target.value)}
          >
            <option value="">선택</option>
            {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* 호수 — 전유부 목록 있으면 드롭다운, 없으면 텍스트 */}
        <div style={S.formField}>
          <label htmlFor="unit-number" style={S.label}>호수</label>

          {unitSource === 'loading' && (
            <div style={{ ...S.addrDisplay, color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>
              호수 목록 조회 중…
            </div>
          )}

          {unitSource === 'list' && (
            <>
              <span style={{ fontSize: 11, color: '#34c759', display: 'block', marginBottom: 4 }}>
                건축물대장 전유부 기준 ({units.length}개 호)
              </span>
              <select
                id="unit-number"
                aria-label="호수"
                style={S.formSelect}
                value={selectedUnitValue}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) {
                    setUnit('')
                    return
                  }
                  const [nextDong, nextHo] = value.split('|')
                  const found = units.find((u) => u.dongNm === nextDong && u.ho === nextHo)
                  if (found) {
                    setDong(found.dongNm)
                    setUnit(unitLabel(found.ho))
                  }
                }}
              >
                <option value="">선택</option>
                {filteredUnits.map((u) => (
                  <option key={unitValue(u)} value={unitValue(u)}>
                    {unitLabel(u.ho)} ({u.area}㎡ · {u.flrNo}층)
                  </option>
                ))}
              </select>
            </>
          )}

          {(unitSource === 'idle' || unitSource === 'text') && (
            <input
              id="unit-number"
              aria-label="호수"
              style={S.input}
              type="text"
              placeholder="예: 1201호"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          )}
        </div>

        {/* 상태 */}
        <div style={S.formField}>
          <label htmlFor="prop-status" style={S.label}>상태</label>
          <select
            id="prop-status"
            aria-label="상태"
            style={S.formSelect}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#ff3b30', marginBottom: 8 }}>{error}</div>
        )}

        <div style={S.modalFooter}>
          <button style={S.cancelBtn} onClick={onClose}>취소</button>
          <button
            style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
            aria-label="저장"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 주소 단축 헬퍼 ─────────────────────────────────────
function shortAddr(addr: string): string {
  const parts = addr.trim().split(/\s+/)
  // "서울특별시 성동구 옥수로 100" → "옥수로 100" (마지막 2개 단어)
  return parts.length > 2 ? parts.slice(-2).join(' ') : addr
}

function blank(value: string | null | undefined): string {
  return value?.trim() || '-'
}

function propertyOwners(row: PropertyRow) {
  return (row.co_ownership ?? [])
    .map((owner) => owner.people)
    .filter(Boolean) as NonNullable<NonNullable<PropertyRow['co_ownership']>[number]['people']>[]
}

function ownerNames(row: PropertyRow): string {
  const names = propertyOwners(row).map((owner) => owner.name).filter(Boolean)
  return names.length > 0 ? names.join(', ') : '-'
}

function ownerPhones(row: PropertyRow): string {
  const phones = propertyOwners(row).map((owner) => owner.phone).filter(Boolean)
  return phones.length > 0 ? phones.join(', ') : '-'
}

function ownerCarriers(row: PropertyRow): string {
  const carriers = propertyOwners(row)
    .map((owner) => owner.carrier || owner.carrier_note)
    .filter(Boolean)
  return carriers.length > 0 ? carriers.join(', ') : '-'
}

// ─── 매물 테이블 행 ──────────────────────────────────────
function PropertyTableRow({
  row,
  onClick,
  selected,
  onToggleSelected,
}: {
  row: PropertyRow
  onClick: (r: PropertyRow) => void
  selected: boolean
  onToggleSelected: (id: string) => void
}) {
  const registeredDate = normalizeRegisteredDate(row.registered_date) || new Date(row.created_at).toLocaleDateString('ko-KR')
  return (
    <tr style={{ cursor: 'pointer' }} onClick={() => onClick(row)}>
      <td style={{ ...S.td, width: 36, position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
        <input
          aria-label={`select-property-${row.id}`}
          type="checkbox"
          checked={selected}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleSelected(row.id)}
        />
      </td>
      <td style={S.td} title={registeredDate}>{registeredDate}</td>
      <td style={S.td} title={blank(row.handling_name)}>{blank(row.handling_name)}</td>
      <td style={S.td} title={blank(row.neighborhood || shortAddr(row.road_address))}>{blank(row.neighborhood || shortAddr(row.road_address))}</td>
      <td style={S.td} title={blank(row.category)}>{blank(row.category)}</td>
      <td style={S.td} title={blank(row.alias)}>{blank(row.alias)}</td>
      <td style={S.td} title={blank(row.building_dong)}>{blank(row.building_dong)}</td>
      <td style={S.td} title={blank(row.unit_number)}>{blank(row.unit_number)}</td>
      <td style={S.td} title={blank(row.ad_level)}>{blank(row.ad_level)}</td>
      <td style={S.td} title={blank(row.deal_type)}>{blank(row.deal_type)}</td>
      <td style={S.td} title={blank(row.price_text)}>{blank(row.price_text)}</td>
      <td style={S.td} title={blank(row.area_text)}>{blank(row.area_text)}</td>
      <td style={S.td} title={ownerNames(row)}>{ownerNames(row)}</td>
      <td style={S.td} title={ownerPhones(row)}>{ownerPhones(row)}</td>
      <td style={S.td} title={ownerCarriers(row)}>{ownerCarriers(row)}</td>
      <td style={S.td} title={blank(row.hanjari_date)}>{blank(row.hanjari_date)}</td>
      <td style={S.td} title={blank(row.deohill_date)}>{blank(row.deohill_date)}</td>
      <td style={S.td} title={blank(row.move_in_date)}>{blank(row.move_in_date)}</td>
      <td style={S.td} title={blank(row.direction)}>{blank(row.direction)}</td>
      <td style={S.td} title={blank(row.maintenance_fee)}>{blank(row.maintenance_fee)}</td>
      <td style={{ ...S.td, maxWidth: 360 }} title={blank(row.notes)}>{blank(row.notes)}</td>
    </tr>
  )
  return (
    <tr style={{ cursor: 'pointer' }} onClick={() => onClick(row)}>
      <td style={{ ...S.td, width: 36 }}>
        <input
          aria-label={`select-property-${row.id}`}
          type="checkbox"
          checked={selected}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleSelected(row.id)}
        />
      </td>
      <td style={S.td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' as const }}>
          <span>{shortAddr(row.road_address)}</span>
          {row.alias && <span style={{ fontSize: 12, color: '#636366' }}>{row.alias}</span>}
          {row.warning && <span style={{ ...S.warningBadge }}>경고</span>}
        </div>
        {row.price_text && (
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{row.price_text}</div>
        )}
      </td>
      <td style={S.td}>{row.building_type || '—'}</td>
      <td style={S.td}>{row.deal_type || '—'}</td>
      <td style={S.td}>{row.unit_number || '—'}</td>
      <td style={S.td}>{row.status}</td>
      <td style={S.td}>{normalizeRegisteredDate(row.registered_date) || new Date(row.created_at).toLocaleDateString('ko-KR')}</td>
    </tr>
  )
}

// ─── 매물 상세 슬라이드 패널 (U3-4) ─────────────────────
interface PropertyPanelProps {
  row: PropertyRow
  onClose: () => void
  onEdit: (row: PropertyRow) => void
  onDelete: (row: PropertyRow) => void
  onLabelChange: (id: string, labels: { is_our_property?: boolean; is_watchlist?: boolean; is_priority?: boolean }) => Promise<void>
}

function PropertyPanel({ row, onClose, onEdit, onDelete, onLabelChange }: PropertyPanelProps) {
  const router = useRouter()
  const [isOurs,  setIsOurs]  = useState(row.is_our_property)
  const [isWatch, setIsWatch] = useState(row.is_watchlist)
  const [isFocus, setIsFocus] = useState(row.is_priority)

  // ── 공동 중개 ──────────────────────────────────────────
  const [coBrokers,       setCoBrokers]       = useState<PropertyAgencyRow[]>([])
  const [coBrokerLoading, setCoBrokerLoading] = useState(false)
  const [coBrokerSearch, setCoBrokerSearch] = useState('')
  const [coBrokerResults, setCoBrokerResults] = useState<AgencyRow[]>([])
  const [coBrokerSearchLoading, setCoBrokerSearchLoading] = useState(false)

  // ── 사진 ──────────────────────────────────────────────
  const [photoMetas,  setPhotoMetas]  = useState<PhotoMeta[]>(row.photo_urls ?? [])
  const [currentUser, setCurrentUser] = useState<string>('')

  // ── 메모 ──────────────────────────────────────────────
  const [memos, setMemos] = useState<PropertyMemoRow[]>([])

  const loadCoBrokers = useCallback(async () => {
    setCoBrokerLoading(true)
    try {
      const data = await listPropertyCoBrokers(row.id)
      setCoBrokers(data)
    } catch {
      // 공동중개 목록 조회 실패 무시 (migration 010 미실행 시)
    } finally {
      setCoBrokerLoading(false)
    }
  }, [row.id])

  const loadMemos = useCallback(async () => {
    try {
      const data = await getPropertyMemos(row.id)
      setMemos(data)
    } catch {
      // 조회 실패 시 빈 목록 유지
    }
  }, [row.id])

  useEffect(() => { loadCoBrokers() }, [loadCoBrokers])
  useEffect(() => { loadMemos() }, [loadMemos])
  useEffect(() => {
    try {
      createBrowserSupabaseClient().auth.getUser().then(({ data }) => {
        setCurrentUser(data.user?.id ?? '')
      }).catch(() => setCurrentUser(''))
    } catch {
      setCurrentUser('')
    }
  }, [])

  async function handleRemoveCoBroker(agencyId: string) {
    try {
      await removePropertyCoBroker(row.id, agencyId)
      await loadCoBrokers()
    } catch {
      // 무시
    }
  }

  async function handleCoBrokerSearch(value: string) {
    setCoBrokerSearch(value)
    const term = value.trim()
    if (!term) {
      setCoBrokerResults([])
      return
    }

    setCoBrokerSearchLoading(true)
    try {
      const results = await searchAgencies(term)
      const linkedIds = new Set(coBrokers.map((broker) => broker.agency_id))
      setCoBrokerResults(results.filter((agency) => !linkedIds.has(agency.id)))
    } catch {
      setCoBrokerResults([])
    } finally {
      setCoBrokerSearchLoading(false)
    }
  }

  async function handleAddCoBroker(agencyId: string) {
    try {
      await addPropertyCoBroker(row.id, agencyId)
      setCoBrokerSearch('')
      setCoBrokerResults([])
      await loadCoBrokers()
    } catch {
      // 무시
    }
  }

  async function handleSaveMemo(payload: MemoSavePayload) {
    await addPropertyMemo(row.id, payload)
    await loadMemos()
  }

  async function handleDeleteMemo(memoId: string) {
    await deletePropertyMemo(memoId)
    await loadMemos()
  }

  async function toggleLabel(field: 'is_our_property' | 'is_watchlist' | 'is_priority', current: boolean, setter: (v: boolean) => void) {
    // 마지막 활성 라벨은 해제 불가 — 최소 1개 유지
    if (current) {
      const afterOurs  = field === 'is_our_property' ? false : isOurs
      const afterWatch = field === 'is_watchlist'    ? false : isWatch
      const afterFocus = field === 'is_priority'     ? false : isFocus
      if (!afterOurs && !afterWatch && !afterFocus) return
    }
    setter(!current)
    try { await onLabelChange(row.id, { [field]: !current }) } catch { setter(current) }
  }

  const handleDiagReport = () => {
    router.push(`/report?roadAddr=${encodeURIComponent(row.road_address)}`)
  }

  return (
    <div data-testid="property-panel" style={S.panel(true)}>
      {/* 헤더 */}
      <div style={S.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={S.panelTitle}>매물 상세</span>
          {row.warning && <span style={S.warningBadge}>경고</span>}
        </div>
        <button style={S.closeBtn} aria-label="닫기" onClick={onClose}>×</button>
      </div>

      {/* 본문 */}
      <div style={S.panelBody}>
        {/* 주소 */}
        <div style={S.panelSection}>
          <div style={S.panelLabel}>도로명 주소</div>
          <div style={S.panelValue}>{row.road_address}</div>
        </div>

        {/* 건물정보 그리드 */}
        <div style={{ ...S.panelSection, ...S.panelGrid }}>
          <div>
            <div style={S.panelLabel}>건물유형</div>
            <div style={S.panelValue}>{row.building_type || '—'}</div>
          </div>
          <div>
            <div style={S.panelLabel}>거래유형</div>
            <div style={S.panelValue}>{row.deal_type || '—'}</div>
          </div>
          <div>
            <div style={S.panelLabel}>상태</div>
            <div style={S.panelValue}>{row.status}</div>
          </div>
          <div>
            <div style={S.panelLabel}>호수</div>
            <div style={S.panelValue}>{row.unit_number || '—'}</div>
          </div>
        </div>

        {/* 라벨 */}
        <div style={S.panelSection}>
          <div style={S.panelLabel}>라벨</div>
          <div style={{ display: 'flex' as const, gap: 6, marginTop: 6, flexWrap: 'wrap' as const }}>
            <button
              style={S.labelChip(isOurs)}
              onClick={() => toggleLabel('is_our_property', isOurs, setIsOurs)}
            >
              우리매물
            </button>
            <button
              style={S.labelChip(isWatch)}
              onClick={() => toggleLabel('is_watchlist', isWatch, setIsWatch)}
            >
              관심매물
            </button>
            <button
              style={S.labelChip(isFocus)}
              onClick={() => toggleLabel('is_priority', isFocus, setIsFocus)}
            >
              집중관리
            </button>
          </div>
        </div>

        {/* 공동 중개 섹션 */}
        <div style={S.panelSection}>
          <div style={S.panelLabel}>공동 중개</div>
          <label htmlFor={`co-broker-search-${row.id}`} style={{ ...S.panelLabel, display: 'block', marginTop: 8 }}>
            공동 중개 부동산 검색
          </label>
          <input
            id={`co-broker-search-${row.id}`}
            aria-label="공동 중개 부동산 검색"
            style={S.input}
            type="search"
            placeholder="부동산명 또는 별칭"
            value={coBrokerSearch}
            onChange={(event) => handleCoBrokerSearch(event.target.value)}
          />
          {coBrokerSearchLoading && (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 6 }}>검색 중…</div>
          )}
          {coBrokerResults.length > 0 && (
            <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
              {coBrokerResults.map((agency) => {
                const label = agency.alias || agency.name
                return (
                  <button
                    key={agency.id}
                    type="button"
                    style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#fff', borderRadius: 8, padding: '7px 10px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit' }}
                    onClick={() => handleAddCoBroker(agency.id)}
                  >
                    {label} 추가
                  </button>
                )
              })}
            </div>
          )}
          {coBrokerLoading ? (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 6 }}>불러오는 중…</div>
          ) : coBrokers.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 6 }}>공동 중개 없음</div>
          ) : (
            <div style={{ marginTop: 6 }}>
              {coBrokers.map((cb) => {
                const agencyData = (cb as unknown as Record<string, unknown>)['agencies'] as Record<string, unknown> | undefined
                const agencyName = agencyData?.['name'] as string | undefined
                return (
                  <div key={cb.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 13 }}>
                    <span style={{ color: '#1d1d1f' }}>{agencyName ?? cb.agency_id}</span>
                    <button
                      style={{ border: 'none', background: 'transparent', color: '#ff3b30', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                      onClick={() => handleRemoveCoBroker(cb.agency_id)}
                    >
                      제거
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 사진 섹션 */}
        {currentUser && (
          <div style={S.panelSection}>
            <div style={S.panelLabel}>사진</div>
            <PropertyPhotoUploader
              propertyId={row.id}
              photoMetas={photoMetas}
              uploadedBy={currentUser}
              onUpdate={setPhotoMetas}
            />
          </div>
        )}

        {/* 메모 섹션 */}
        <div style={S.panelSection}>
          <div style={S.panelLabel}>메모</div>
          <MemoSection
            memos={memos}
            onSave={handleSaveMemo}
            onDelete={handleDeleteMemo}
          />
        </div>
      </div>

      {/* 푸터 */}
      <div style={S.panelFooter}>
        <button style={S.reportBtn} onClick={() => onEdit(row)}>
          수정
        </button>
        <button style={{ ...S.reportBtn, borderColor: '#ff3b30', color: '#ff3b30' }} onClick={() => onDelete(row)}>
          삭제
        </button>
        <button style={S.reportBtn} onClick={handleDiagReport}>
          진단 리포트 보기 →
        </button>
      </div>
    </div>
  )
}

// ─── URL 파라미터 유효성 검증 헬퍼 ──────────────────────
function safeIntParam(searchParams: ReturnType<typeof useSearchParams>, key: string, fallback = '0'): string {
  const raw = searchParams.get(key) ?? fallback
  const n   = Number(raw)
  return Number.isFinite(n) ? String(Math.floor(n)) : fallback
}

function safeTabParam(value: string | null): TabKey {
  return TABS.some((tab) => tab.key === value) ? (value as TabKey) : 'all'
}

// ─── 페이지 내부 (useSearchParams → Suspense 필수) ────────
function PropertiesPageInner() {
  const searchParams = useSearchParams()
  const handlingPersonId  = searchParams.get('handlingPersonId')  || undefined
  const ownerPersonId     = searchParams.get('ownerPersonId')     || undefined
  const handlingAgencyId  = searchParams.get('handlingAgencyId')  || undefined
  const coBrokerAgencyId  = searchParams.get('coBrokerAgencyId')  || undefined
  const [activeTab,    setActiveTab]    = useState<TabKey>(() => safeTabParam(searchParams.get('tab')))
  const [dealType,     setDealType]     = useState(() => searchParams.get('dealType') ?? '')
  const [showForm,     setShowForm]     = useState(false)
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [formPrefill,  setFormPrefill]  = useState<PropertyFormPrefill | undefined>()
  const [rows,         setRows]         = useState<PropertyRow[]>([])
  const [loading,      setLoading]      = useState(false)
  const [selectedRow,  setSelectedRow]  = useState<PropertyRow | null>(null)
  const [editingRow,   setEditingRow]   = useState<PropertyRow | null>(null)
  const [deletingRow,  setDeletingRow]  = useState<PropertyRow | null>(null)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [search,       setSearch]       = useState(() => searchParams.get('q') ?? '')
  const [duplicateOnly, setDuplicateOnly] = useState(() => searchParams.get('duplicateOnly') === '1')
  const [registeredDateFrom, setRegisteredDateFrom] = useState(() => registeredDateInputValue(searchParams.get('registeredDateFrom')) ?? '')
  const [registeredDateTo,   setRegisteredDateTo]   = useState(() => registeredDateInputValue(searchParams.get('registeredDateTo')) ?? '')
  const [urlInput,     setUrlInput]     = useState('')
  const [urlParsing,   setUrlParsing]   = useState(false)
  const [urlError,     setUrlError]     = useState('')
  const [urlProperty,  setUrlProperty]  = useState<ParsedUrlProperty | null>(null)
  const [sheetSyncing, setSheetSyncing] = useState(false)
  const [sheetMessage, setSheetMessage] = useState('')
  const [sort, setSort] = useState<SortState<PropertySortKey>>({ key: 'registeredDate', direction: 'desc' })
  const debouncedSearch = useDebounce(search)
  const prefillApplied = useRef(false)

  // 빠른 주소 검색의 "매물로 등록" 버튼에서 redirect 시 폼 자동 오픈
  useEffect(() => {
    if (prefillApplied.current) return
    if (searchParams.get('register') !== '1') return
    prefillApplied.current = true

    const roadAddr = searchParams.get('roadAddr') ?? ''
    const bdMgtSn  = searchParams.get('bdMgtSn')  ?? ''
    const admCd    = searchParams.get('admCd')    ?? ''
    if (!roadAddr || !bdMgtSn) return

    const pf: PropertyFormPrefill = {
      roadAddr,
      bdMgtSn,
      admCd,
      lnbrMnnm:     safeIntParam(searchParams, 'lnbrMnnm'),
      lnbrSlno:     safeIntParam(searchParams, 'lnbrSlno'),
      mtYn:         searchParams.get('mtYn') === '1' ? '1' : '0',
      bdNm:         searchParams.get('bdNm')        || undefined,
      dong:         searchParams.get('dong')        || undefined,
      ho:           searchParams.get('ho')          || undefined,
      propertyType: searchParams.get('propertyType') || undefined,
    }
    setFormPrefill(pf)
    setShowForm(true)
  }, [searchParams])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listProperties({
        tab: activeTab,
        dealType: dealType || undefined,
        handlingPersonId,
        ownerPersonId,
        handlingAgencyId,
        coBrokerAgencyId,
      })
      setRows(data)
    } catch {
      // 조회 실패 시 빈 목록 유지
    } finally {
      setLoading(false)
    }
  }, [activeTab, dealType, handlingPersonId, ownerPersonId, handlingAgencyId, coBrokerAgencyId])

  useEffect(() => { loadList() }, [loadList])

  async function handleParseUrl() {
    const url = urlInput.trim()
    if (!url) {
      setUrlError('URL을 입력해 주세요.')
      return
    }
    setUrlParsing(true)
    setUrlError('')
    setUrlProperty(null)
    try {
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok || !result.property) {
        setUrlError(result.error ?? 'URL 파싱에 실패했습니다.')
        return
      }
      setUrlProperty(result.property as ParsedUrlProperty)
    } catch {
      setUrlError('URL 파싱에 실패했습니다.')
    } finally {
      setUrlParsing(false)
    }
  }

  async function handleSaveUrlDraft() {
    if (!urlProperty?.source_platform || !urlProperty.source_url) return
    await saveProperty({
      road_address: urlProperty.road_address || urlProperty.source_url,
      building_name: urlProperty.building_name,
      deal_type: urlProperty.deal_type,
      price_text: urlProperty.price_text,
      area_text: urlProperty.area_text,
      description: urlProperty.description || [
        urlProperty.source_external_id ? `외부 매물 ID: ${urlProperty.source_external_id}` : '',
        urlProperty.source_complex_id ? `외부 단지 ID: ${urlProperty.source_complex_id}` : '',
      ].filter(Boolean).join('\n') || undefined,
      source_platform: urlProperty.source_platform,
      source_url: urlProperty.source_url,
      status: '공실',
      is_our_property: true,
    })
    setShowUrlModal(false)
    setUrlInput('')
    setUrlProperty(null)
    await loadList()
  }

  async function handleSheetSync() {
    setSheetSyncing(true)
    setSheetMessage('')
    try {
      const response = await fetch('/api/sheets-sync', { method: 'POST' })
      const result = await response.json()
      if (!response.ok || !result.ok) {
        setSheetMessage(`시트 동기화 실패: ${result.error ?? '알 수 없는 오류'}`)
        return
      }
      setSheetMessage(`시트 동기화 완료: ${result.synced ?? 0}건`)
      await loadList()
    } catch {
      setSheetMessage('시트 동기화 실패: 네트워크 오류')
    } finally {
      setSheetSyncing(false)
    }
  }

  function updateRegisteredDateUrl(from: string, to: string) {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (from) params.set('registeredDateFrom', from)
    else params.delete('registeredDateFrom')
    if (to) params.set('registeredDateTo', to)
    else params.delete('registeredDateTo')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  function setRegisteredDateRange(from: string, to: string) {
    setRegisteredDateFrom(from)
    setRegisteredDateTo(to)
    setSelectedIds(new Set())
    updateRegisteredDateUrl(from, to)
  }

  function updateListFilterUrl(updates: Record<string, string | null>) {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  function setTabFilter(next: TabKey) {
    setActiveTab(next)
    setSelectedIds(new Set())
    updateListFilterUrl({ tab: next === 'all' ? null : next })
  }

  function setDealTypeFilter(next: string) {
    setDealType(next)
    setSelectedIds(new Set())
    updateListFilterUrl({ dealType: next || null })
  }

  function setSearchFilter(next: string) {
    setSearch(next)
    setSelectedIds(new Set())
    updateListFilterUrl({ q: next.trim() || null })
  }

  function setDuplicateFilter(next: boolean) {
    setDuplicateOnly(next)
    setSelectedIds(new Set())
    updateListFilterUrl({ duplicateOnly: next ? '1' : null })
  }

  function setMonthRange(offset: number) {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
    const from = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`
    const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    setRegisteredDateRange(from, to)
  }

  const empty = EMPTY_MSG[activeTab]
  const duplicateIds = findDuplicatePropertyIds(rows)
  const filteredRows = rows.filter((row) => {
    if (duplicateOnly && !duplicateIds.has(row.id)) return false

    if ((registeredDateFrom || registeredDateTo) && !isRegisteredDateInRange(row.registered_date, registeredDateFrom, registeredDateTo)) {
      return false
    }

    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return true
    return [
      row.road_address,
      row.building_name ?? '',
      row.building_dong ?? '',
      row.unit_number ?? '',
      row.building_type ?? '',
      row.deal_type ?? '',
      row.status,
    ].some((value) => value.toLowerCase().includes(q))
  })
  const sortedRows = [...filteredRows].sort((a, b) => {
    switch (sort.key) {
      case 'registeredDate': return compareDate(normalizeRegisteredDate(a.registered_date) || a.created_at, normalizeRegisteredDate(b.registered_date) || b.created_at, sort.direction)
      case 'handling': return compareText(a.handling_name, b.handling_name, sort.direction)
      case 'address': return compareText(a.neighborhood || shortAddr(a.road_address), b.neighborhood || shortAddr(b.road_address), sort.direction)
      case 'category': return compareText(a.category, b.category, sort.direction)
      case 'alias': return compareText(a.alias, b.alias, sort.direction)
      case 'dong': return compareText(a.building_dong, b.building_dong, sort.direction)
      case 'unit': return compareText(a.unit_number, b.unit_number, sort.direction)
      case 'adLevel': return compareText(a.ad_level, b.ad_level, sort.direction)
      case 'dealType': return compareText(a.deal_type, b.deal_type, sort.direction)
      case 'price': return compareNumber(parseKoreanPrice(a.price_text), parseKoreanPrice(b.price_text), sort.direction)
      case 'area': return compareNumber(parseNumberText(a.area_text), parseNumberText(b.area_text), sort.direction)
      case 'owner': return compareText(ownerNames(a), ownerNames(b), sort.direction)
      case 'phone': return compareText(ownerPhones(a), ownerPhones(b), sort.direction)
      case 'carrier': return compareText(ownerCarriers(a), ownerCarriers(b), sort.direction)
      case 'hanjari': return compareText(a.hanjari_date, b.hanjari_date, sort.direction)
      case 'deohill': return compareText(a.deohill_date, b.deohill_date, sort.direction)
      case 'moveIn': return compareText(a.move_in_date, b.move_in_date, sort.direction)
      case 'direction': return compareText(a.direction, b.direction, sort.direction)
      case 'maintenance': return compareNumber(parseKoreanPrice(a.maintenance_fee), parseKoreanPrice(b.maintenance_fee), sort.direction)
    }
  })
  const visibleIds = sortedRows.map((row) => row.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const hasActiveFilters = Boolean(search.trim() || dealType || registeredDateFrom || registeredDateTo || duplicateOnly || activeTab !== 'all')
  const filterSummary = [
    activeTab !== 'all' ? TABS.find((tab) => tab.key === activeTab)?.label : '',
    dealType ? `거래유형 ${dealType}` : '',
    duplicateOnly ? `중복 의심 ${duplicateIds.size}건` : '',
    registeredDateFrom || registeredDateTo
      ? `등록일 ${normalizeRegisteredDate(registeredDateFrom) ?? '처음'} ~ ${normalizeRegisteredDate(registeredDateTo) ?? '끝'}`
      : '',
    search.trim() ? `검색 "${search.trim()}"` : '',
  ].filter(Boolean).join(' · ')

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab, dealType, debouncedSearch, duplicateOnly, registeredDateFrom, registeredDateTo])

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map((id) => deleteProperty(id)))
    setBulkDeleting(false)
    setSelectedIds(new Set())
    setSelectedRow((prev) => (prev && ids.includes(prev.id) ? null : prev))
    await loadList()
  }

  return (
    <>
      <Header title="매물 관리" />
      <main style={S.main}>

        {/* 툴바 */}
        <div style={S.toolbar}>
          <div style={S.tabGroup} role="tablist">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                role="button"
                data-active={activeTab === key}
                style={S.tab(activeTab === key)}
                onClick={() => setTabFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={S.actions}>
            <SearchInput value={search} onChange={setSearchFilter} placeholder="주소, 동호수 검색" label="매물 검색" />
            <label htmlFor="deal-type-filter" style={{ display: 'none' }}>거래유형 필터</label>
            <select
              id="deal-type-filter"
              aria-label="거래유형 필터"
              role="combobox"
              style={S.select}
              value={dealType}
              onChange={(e) => setDealTypeFilter(e.target.value)}
            >
              <option value="">거래유형 전체</option>
              {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#636366' }}>
              등록일
              <input
                aria-label="registered-date-from"
                type="date"
                value={registeredDateFrom}
                onChange={(event) => setRegisteredDateRange(event.target.value, registeredDateTo)}
                style={{ ...S.input, width: 128, padding: '7px 10px', fontSize: 12 }}
              />
            </label>
            <span style={{ fontSize: 12, color: '#86868b' }}>~</span>
            <input
              aria-label="registered-date-to"
              type="date"
              value={registeredDateTo}
              onChange={(event) => setRegisteredDateRange(registeredDateFrom, event.target.value)}
              style={{ ...S.input, width: 128, padding: '7px 10px', fontSize: 12 }}
            />
            <button
              type="button"
              style={{ ...S.cancelBtn, padding: '7px 12px', fontSize: 13 }}
              onClick={() => setMonthRange(0)}
            >
              이번 달
            </button>
            <button
              type="button"
              style={{ ...S.cancelBtn, padding: '7px 12px', fontSize: 13 }}
              onClick={() => setMonthRange(-1)}
            >
              지난 달
            </button>
            {(registeredDateFrom || registeredDateTo) && (
              <button
                type="button"
                style={{ ...S.cancelBtn, padding: '7px 12px', fontSize: 13 }}
              onClick={() => setRegisteredDateRange('', '')}
              >
                기간 해제
              </button>
            )}

            <button
              type="button"
              aria-pressed={duplicateOnly}
              style={{
                ...S.cancelBtn,
                padding: '7px 12px',
                fontSize: 13,
                opacity: duplicateIds.size > 0 || duplicateOnly ? 1 : 0.5,
                ...(duplicateOnly ? { background: '#1d1d1f', color: '#ffffff', borderColor: '#1d1d1f' } : {}),
              }}
              disabled={duplicateIds.size === 0 && !duplicateOnly}
              onClick={() => setDuplicateFilter(!duplicateOnly)}
            >
              중복 의심 {duplicateIds.size}
            </button>

            <button
              style={S.addBtn}
              aria-label="매물 등록"
              onClick={() => setShowForm(true)}
            >
              + 매물 등록
            </button>

            <button
              style={{ ...S.cancelBtn, padding: '7px 12px', fontSize: 13 }}
              type="button"
              onClick={() => setShowUrlModal(true)}
            >
              URL로 매물 등록
            </button>

            <button
              style={{ ...S.cancelBtn, padding: '7px 12px', fontSize: 13, opacity: sheetSyncing ? 0.65 : 1 }}
              type="button"
              disabled={sheetSyncing}
              onClick={handleSheetSync}
            >
              {sheetSyncing ? '동기화 중' : '시트 동기화'}
            </button>
            {selectedIds.size > 0 && (
              <>
                <button
                  style={{ ...S.cancelBtn, padding: '7px 12px', fontSize: 13 }}
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                >
                  선택 해제
                </button>
                <button
                  style={{ ...S.cancelBtn, padding: '7px 12px', fontSize: 13, color: '#ff3b30' }}
                  type="button"
                  onClick={() => setBulkDeleting(true)}
                >
                  선택 {selectedIds.size}개 삭제
                </button>
              </>
            )}
          </div>
        </div>

        {sheetMessage && (
          <div style={{ fontSize: 12, color: sheetMessage.includes('실패') ? '#ff3b30' : '#34c759', margin: '-8px 0 12px', textAlign: 'right' }}>
            {sheetMessage}
          </div>
        )}

        {/* 리스트 카드 */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '-6px 0 12px', fontSize: 12, color: '#636366' }}>
            <span>
              필터 결과 {filteredRows.length}건
              {filterSummary ? ` · ${filterSummary}` : ''}
            </span>
            {selectedIds.size > 0 && <span style={{ color: '#ff3b30', fontWeight: 700 }}>선택 {selectedIds.size}건</span>}
          </div>
        )}

        <div style={S.card}>
          {loading ? (
            <div style={{ ...S.empty, padding: '40px 0' }}>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>불러오는 중…</div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={S.empty}>
              <div style={S.emptyIcon}>🏠</div>
              <div style={S.emptyTitle}>{empty.title}</div>
              <div style={S.emptyDesc}>{empty.desc}</div>
              <button style={S.emptyBtn} onClick={() => setShowForm(true)}>+ 매물 등록</button>
            </div>
          ) : (
            <div style={S.tableScroll}>
            <table style={{ ...S.table, minWidth: 2200 }}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 36, position: 'sticky', left: 0, background: '#fff', zIndex: 2 }}>
                    <input
                      aria-label="select-all-properties"
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <SortableHeader style={S.th} label="등록일" sortKey="registeredDate" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="핸들링" sortKey="handling" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="대표주소" sortKey="address" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="카테고리" sortKey="category" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="별칭" sortKey="alias" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="동" sortKey="dong" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="호수" sortKey="unit" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="랜덤광고" sortKey="adLevel" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="종류" sortKey="dealType" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="가격" sortKey="price" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="면적" sortKey="area" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="소유자" sortKey="owner" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="연락처" sortKey="phone" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="통신사" sortKey="carrier" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="한자리" sortKey="hanjari" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="더힐" sortKey="deohill" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="입주시기" sortKey="moveIn" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="방향" sortKey="direction" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="관리비" sortKey="maintenance" sort={sort} onSort={setSort} />
                  <th style={S.th}>기타사항</th>
                </tr>
              </thead>
              <thead style={{ display: 'none' }}>
                <tr>
                  <th style={{ ...S.th, width: 36 }}>
                    <input
                      aria-label="select-all-properties-hidden"
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <th style={S.th}>주소</th>
                  <th style={S.th}>건물유형</th>
                  <th style={S.th}>거래유형</th>
                  <th style={S.th}>호수</th>
                  <th style={S.th}>상태</th>
                  <th style={S.th}>등록일</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <PropertyTableRow
                    key={r.id}
                    row={r}
                    onClick={setSelectedRow}
                    selected={selectedIds.has(r.id)}
                    onToggleSelected={toggleSelected}
                  />
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

      </main>

      {/* 매물 등록 폼 모달 */}
      {showForm && (
        <PropertyForm
          onClose={() => { setShowForm(false); setFormPrefill(undefined) }}
          onSaved={() => { setShowForm(false); setFormPrefill(undefined); loadList() }}
          prefill={formPrefill}
        />
      )}

      {showUrlModal && (
        <div style={S.overlay}>
          <div style={S.modal} role="dialog" aria-modal="true" aria-label="URL로 매물 등록">
            <div style={S.modalTitle}>URL로 매물 등록</div>
            <div style={S.formField}>
              <label htmlFor="external-property-url" style={S.label}>외부 매물 URL</label>
              <input
                id="external-property-url"
                aria-label="외부 매물 URL"
                style={S.input}
                type="url"
                placeholder="네이버, 직방, 피터팬, 다방 URL"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
              />
            </div>

            {urlError && <div style={{ fontSize: 12, color: '#ff3b30', marginBottom: 10 }}>{urlError}</div>}

            {urlProperty && (
              <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 12, marginBottom: 12, background: '#f5f5f7' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>출처: {urlProperty.source_platform}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>
                  {[
                    urlProperty.road_address,
                    urlProperty.building_name,
                    urlProperty.deal_type,
                    urlProperty.price_text,
                    urlProperty.source_external_id ? `ID ${urlProperty.source_external_id}` : '',
                  ].filter(Boolean).join(' · ') || urlProperty.source_url}
                </div>
              </div>
            )}

            <div style={S.modalFooter}>
              <button
                style={S.cancelBtn}
                type="button"
                onClick={() => {
                  setShowUrlModal(false)
                  setUrlError('')
                  setUrlProperty(null)
                }}
              >
                취소
              </button>
              <button
                style={S.cancelBtn}
                type="button"
                disabled={urlParsing}
                onClick={handleParseUrl}
              >
                {urlParsing ? '파싱 중' : 'URL 파싱'}
              </button>
              <button
                style={{ ...S.saveBtn, opacity: urlProperty ? 1 : 0.5 }}
                type="button"
                disabled={!urlProperty}
                onClick={handleSaveUrlDraft}
              >
                매물 초안 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 매물 상세 슬라이드 패널 (U3-4) */}
      {selectedRow && (
        <>
          {/* 딤드 오버레이 */}
          <div style={S.panelOverlay} onClick={() => setSelectedRow(null)} />
          <PropertyPanel
            row={selectedRow}
            onClose={() => setSelectedRow(null)}
            onEdit={(row) => {
              setSelectedRow(null)
              setEditingRow(row)
            }}
            onDelete={(row) => setDeletingRow(row)}
            onLabelChange={async (id, labels) => {
              await updatePropertyLabels(id, labels)
              await loadList()
            }}
          />
        </>
      )}
      {editingRow && (
        <PropertyForm
          editData={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={() => { setEditingRow(null); loadList() }}
        />
      )}
      {deletingRow && (
        <ConfirmDialog
          title="매물을 삭제할까요?"
          description={`${deletingRow.road_address} 매물이 삭제됩니다.`}
          onCancel={() => setDeletingRow(null)}
          onConfirm={async () => {
            await deleteProperty(deletingRow.id)
            setDeletingRow(null)
            setSelectedRow(null)
            await loadList()
          }}
        />
      )}
      {bulkDeleting && (
        <ConfirmDialog
          title="선택 매물을 삭제할까요?"
          description={`${selectedIds.size}개 매물이 삭제됩니다.${filterSummary ? ` 현재 필터: ${filterSummary}` : ''}`}
          confirmLabel="삭제"
          cancelLabel="취소"
          onCancel={() => setBulkDeleting(false)}
          onConfirm={handleBulkDelete}
        />
      )}
    </>
  )
}

// ─── 페이지 (Suspense 경계) ──────────────────────────────
// useSearchParams()는 Next.js App Router에서 Suspense 내부에서만 사용 가능
export default function PropertiesPage() {
  return (
    <Suspense fallback={null}>
      <PropertiesPageInner />
    </Suspense>
  )
}
