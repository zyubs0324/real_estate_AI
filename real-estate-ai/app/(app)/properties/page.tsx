'use client'

// apple.md §14 — 매물 리스트 페이지
// U3-1: 탭 필터 + 빈 상태
// U3-2: 매물 등록 폼 + DB 저장
// U3-4: 슬라이드 패널

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import AddressSearch from '@/components/address/AddressSearch'
import type { JusoResult } from '@/lib/apis/juso'
import { fetchBuilding, fetchBuildingUnits, type BuildingUnit } from '@/lib/apis/building'
import { saveProperty, listProperties, updatePropertyLabels, getPropertyMemos, addPropertyMemo, deletePropertyMemo, type PropertyRow, type SavePropertyPayload, type PropertyMemoRow } from '@/lib/supabase/properties'
import MemoSection, { type MemoSavePayload } from '@/components/common/MemoSection'

// ─── 타입 ─────────────────────────────────────────────────
type TabKey = 'all' | 'ours' | 'interest' | 'focus'

interface Tab {
  key: TabKey
  label: string
}

// ─── 상수 ─────────────────────────────────────────────────
const TABS: Tab[] = [
  { key: 'all',      label: '전체' },
  { key: 'ours',     label: '우리매물' },
  { key: 'interest', label: '관심매물' },
  { key: 'focus',    label: '집중관리' },
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
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(0,0,0,0.4)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '12px 12px',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    color: '#1d1d1f',
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
}

// ─── 매물 등록 폼 ────────────────────────────────────────
interface PropertyFormProps {
  onClose: () => void
  onSaved: () => void
}

type BldTypeSource = 'idle' | 'loading' | 'api' | 'manual'
type UnitSource    = 'idle' | 'loading' | 'list' | 'text'

function PropertyForm({ onClose, onSaved }: PropertyFormProps) {
  const [addr,          setAddr]          = useState<JusoResult | null>(null)
  const [bldType,       setBldType]       = useState('')
  const [bldTypeSource, setBldTypeSource] = useState<BldTypeSource>('idle')
  const [dong,          setDong]          = useState('')          // detBdNmList 자동 저장
  const [units,         setUnits]         = useState<BuildingUnit[]>([])
  const [unitSource,    setUnitSource]    = useState<UnitSource>('idle')
  const [unit,          setUnit]          = useState('')
  const [deal,          setDeal]          = useState('')
  const [status,        setStatus]        = useState('공실')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')

  async function handleAddressSelect(r: JusoResult) {
    setAddr(r)
    // 동 — detBdNmList 자동 적용 (예: "101동")
    setDong(r.detBdNmList ?? '')
    // 호수 초기화
    setUnit('')
    setUnits([])
    setUnitSource('idle')
    // 건물유형 초기화 후 API 조회
    setBldType('')
    setBldTypeSource('loading')

    try {
      // 표제부(건물유형)와 전유부(호수 목록) 병렬 조회
      const [bldResult, unitList] = await Promise.all([
        fetchBuilding(r.bdMgtSn),
        fetchBuildingUnits(r.bdMgtSn),
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
        setUnitSource('list')
      } else {
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
      await saveProperty(payload)

      // U3-3: Quick Check 백그라운드 자동 실행 (실패해도 저장에 영향 없음)
      fetch('/api/quick-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bdMgtSn:  addr.bdMgtSn,
          roadAddr: addr.roadAddr,
          siNm:     addr.siNm,
          sggNm:    addr.sggNm,
          emdNm:    addr.emdNm,
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
        <div style={S.modalTitle}>매물 등록</div>

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

        {/* 동 — Juso API detBdNmList 자동 저장 */}
        {dong && (
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
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="">선택</option>
                {units.map((u) => (
                  <option key={u.ho} value={`${u.ho}호`}>
                    {u.ho}호 ({u.area}㎡ · {u.flrNo}층)
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

// ─── 매물 테이블 행 ──────────────────────────────────────
function PropertyTableRow({ row, onClick }: { row: PropertyRow; onClick: (r: PropertyRow) => void }) {
  return (
    <tr style={{ cursor: 'pointer' }} onClick={() => onClick(row)}>
      <td style={S.td}>
        {shortAddr(row.road_address)}
        {row.warning && <span style={{ ...S.warningBadge, marginLeft: 6 }}>경고</span>}
      </td>
      <td style={S.td}>{row.building_type || '—'}</td>
      <td style={S.td}>{row.deal_type || '—'}</td>
      <td style={S.td}>{row.unit_number || '—'}</td>
      <td style={S.td}>{row.status}</td>
      <td style={S.td}>{new Date(row.created_at).toLocaleDateString('ko-KR')}</td>
    </tr>
  )
}

// ─── 매물 상세 슬라이드 패널 (U3-4) ─────────────────────
interface PropertyPanelProps {
  row: PropertyRow
  onClose: () => void
  onLabelChange: (id: string, labels: { is_our_property?: boolean; is_watchlist?: boolean; is_priority?: boolean }) => Promise<void>
}

function PropertyPanel({ row, onClose, onLabelChange }: PropertyPanelProps) {
  const router = useRouter()
  const [isOurs,  setIsOurs]  = useState(row.is_our_property)
  const [isWatch, setIsWatch] = useState(row.is_watchlist)
  const [isFocus, setIsFocus] = useState(row.is_priority)

  // ── 메모 ──────────────────────────────────────────────
  const [memos, setMemos] = useState<PropertyMemoRow[]>([])

  const loadMemos = useCallback(async () => {
    try {
      const data = await getPropertyMemos(row.id)
      setMemos(data)
    } catch {
      // 조회 실패 시 빈 목록 유지
    }
  }, [row.id])

  useEffect(() => { loadMemos() }, [loadMemos])

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
        <button style={S.reportBtn} onClick={handleDiagReport}>
          진단 리포트 보기 →
        </button>
      </div>
    </div>
  )
}

// ─── 페이지 ──────────────────────────────────────────────
export default function PropertiesPage() {
  const [activeTab,    setActiveTab]    = useState<TabKey>('all')
  const [dealType,     setDealType]     = useState('')
  const [showForm,     setShowForm]     = useState(false)
  const [rows,         setRows]         = useState<PropertyRow[]>([])
  const [loading,      setLoading]      = useState(false)
  const [selectedRow,  setSelectedRow]  = useState<PropertyRow | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listProperties({ tab: activeTab, dealType: dealType || undefined })
      setRows(data)
    } catch {
      // 조회 실패 시 빈 목록 유지
    } finally {
      setLoading(false)
    }
  }, [activeTab, dealType])

  useEffect(() => { loadList() }, [loadList])

  const empty = EMPTY_MSG[activeTab]

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
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={S.actions}>
            <label htmlFor="deal-type-filter" style={{ display: 'none' }}>거래유형 필터</label>
            <select
              id="deal-type-filter"
              aria-label="거래유형 필터"
              role="combobox"
              style={S.select}
              value={dealType}
              onChange={(e) => setDealType(e.target.value)}
            >
              <option value="">거래유형 전체</option>
              {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <button
              style={S.addBtn}
              aria-label="매물 등록"
              onClick={() => setShowForm(true)}
            >
              + 매물 등록
            </button>
          </div>
        </div>

        {/* 리스트 카드 */}
        <div style={S.card}>
          {loading ? (
            <div style={{ ...S.empty, padding: '40px 0' }}>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>불러오는 중…</div>
            </div>
          ) : rows.length === 0 ? (
            <div style={S.empty}>
              <div style={S.emptyIcon}>🏠</div>
              <div style={S.emptyTitle}>{empty.title}</div>
              <div style={S.emptyDesc}>{empty.desc}</div>
              <button style={S.emptyBtn} onClick={() => setShowForm(true)}>+ 매물 등록</button>
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>주소</th>
                  <th style={S.th}>건물유형</th>
                  <th style={S.th}>거래유형</th>
                  <th style={S.th}>호수</th>
                  <th style={S.th}>상태</th>
                  <th style={S.th}>등록일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => <PropertyTableRow key={r.id} row={r} onClick={setSelectedRow} />)}
              </tbody>
            </table>
          )}
        </div>

      </main>

      {/* 매물 등록 폼 모달 */}
      {showForm && (
        <PropertyForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadList() }}
        />
      )}

      {/* 매물 상세 슬라이드 패널 (U3-4) */}
      {selectedRow && (
        <>
          {/* 딤드 오버레이 */}
          <div style={S.panelOverlay} onClick={() => setSelectedRow(null)} />
          <PropertyPanel
            row={selectedRow}
            onClose={() => setSelectedRow(null)}
            onLabelChange={async (id, labels) => {
              await updatePropertyLabels(id, labels)
              await loadList()
            }}
          />
        </>
      )}
    </>
  )
}
