'use client'

// apple.md §14 — 거래 관리 페이지
// U3-7: 거래 등록 + 납부 단계 자동 생성

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import SearchInput from '@/components/common/SearchInput'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import SortableHeader from '@/components/common/SortableHeader'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { compareDate, compareNumber, compareText, type SortState } from '@/lib/table/sort'
import {
  listTransactions, saveTransaction, createDefaultPayments,
  getTransactionMemos, addTransactionMemo, deleteTransactionMemo,
  updateTransaction, deleteTransaction,
  type TransactionRow, type SaveTransactionPayload, type TransactionMemoRow,
} from '@/lib/supabase/transactions'
import { listProperties, type PropertyRow } from '@/lib/supabase/properties'
import MemoSection, { type MemoSavePayload } from '@/components/common/MemoSection'

// ─── 상수 ─────────────────────────────────────────────────
const DEAL_TYPES    = ['매매', '전세', '월세', '단기임대']
const STATUS_OPTIONS = ['상담', '계약진행', '계약완료', '잔금완료', '취소']
type TransactionSortKey = 'property' | 'dealType' | 'status' | 'price' | 'contractDate' | 'endDate'

const STATUS_COLOR: Record<string, string> = {
  '상담':     '#636366',
  '계약진행': '#0071e3',
  '계약완료': '#34c759',
  '잔금완료': '#34c759',
  '취소':     '#ff3b30',
}

// ─── 스타일 ────────────────────────────────────────────────
const S = {
  main: {
    flex: 1, overflowY: 'auto' as const, padding: '24px',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  },
  toolbar: {
    display: 'flex' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const, marginBottom: 16,
  },
  addBtn: {
    padding: '7px 16px', borderRadius: 8, border: 'none',
    background: '#0071e3', color: '#ffffff',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  card: {
    background: '#ffffff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 24px',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  tableScroll: {
    overflow: 'auto' as const,
    width: '100%',
    maxHeight: 'calc(100vh - 300px)',
    scrollbarGutter: 'stable' as const,
  },
  th: {
    position: 'sticky' as const, top: 0, zIndex: 2,
    padding: '8px 12px', textAlign: 'left' as const, fontSize: 11,
    fontWeight: 600, color: 'rgba(0,0,0,0.4)', background: '#ffffff',
    borderBottom: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '12px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', color: '#1d1d1f',
  },
  statusBadge: (status: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
    fontSize: 11, fontWeight: 700,
    background: `${STATUS_COLOR[status] ?? '#636366'}18`,
    color: STATUS_COLOR[status] ?? '#636366',
  }),
  empty: {
    display: 'flex' as const, flexDirection: 'column' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    padding: '80px 0', gap: 12,
  },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1d1d1f' },
  emptyDesc:  { fontSize: 13, color: 'rgba(0,0,0,0.4)', textAlign: 'center' as const },
  warningBadge: {
    display: 'inline-block', fontSize: 11, fontWeight: 700,
    padding: '2px 7px', borderRadius: 6,
    background: '#ff3b3018', color: '#ff3b30',
  } as React.CSSProperties,
  // 메모 패널 (슬라이드)
  panel: (open: boolean): React.CSSProperties => ({
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: 360, background: '#ffffff',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.25s ease',
    display: 'flex', flexDirection: 'column',
    zIndex: 200, fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  }),
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  panelTitle:  { fontSize: 15, fontWeight: 700, color: '#1d1d1f' },
  closeBtn: {
    background: 'transparent', border: 'none', fontSize: 20,
    cursor: 'pointer', color: 'rgba(0,0,0,0.4)', lineHeight: 1,
  },
  panelBody: { flex: 1, overflowY: 'auto' as const, padding: '20px' },
  panelSection: { marginBottom: 20 },
  panelLabel:   { fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  panelValue:   { fontSize: 14, color: '#1d1d1f', fontWeight: 500 },
  // 모달
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.3)',
    display: 'flex' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, zIndex: 100,
  },
  modal: {
    background: '#ffffff', borderRadius: 16, padding: '28px 32px',
    width: '100%', maxWidth: 540,
    boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    maxHeight: '90vh', overflowY: 'auto' as const,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: 20 },
  formField:  { marginBottom: 16 },
  formGrid:   { display: 'grid' as const, gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  label: {
    display: 'block' as const, fontSize: 12, fontWeight: 600,
    color: 'rgba(0,0,0,0.5)', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)', fontSize: 14,
    color: '#1d1d1f', background: '#f5f5f7',
    boxSizing: 'border-box' as const, fontFamily: 'inherit',
  },
  formSelect: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)', fontSize: 14,
    color: '#1d1d1f', background: '#ffffff', fontFamily: 'inherit',
  },
  paymentPreview: {
    marginTop: 4, padding: '10px 14px', borderRadius: 8,
    background: 'rgba(0,113,227,0.06)', fontSize: 12, color: '#1d1d1f',
  },
  paymentRow: {
    display: 'flex' as const, justifyContent: 'space-between' as const,
    padding: '3px 0', fontSize: 12,
  },
  modalFooter: {
    display: 'flex' as const, justifyContent: 'flex-end' as const,
    gap: 8, marginTop: 24,
  },
  cancelBtn: {
    padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
    background: '#ffffff', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '9px 22px', borderRadius: 8, border: 'none',
    background: '#0071e3', color: '#ffffff',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
}

// ─── 금액 포맷 ────────────────────────────────────────────
function fmtPrice(n: number | null): string {
  if (!n) return '—'
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000)      return `${(n / 10_000).toFixed(0)}만`
  return `${n.toLocaleString()}원`
}

function shortAddr(addr: string): string {
  const parts = addr.trim().split(/\s+/)
  return parts.length > 2 ? parts.slice(-2).join(' ') : addr
}

// 매물 선택 드롭다운용 — 주소 + 건물명 + 동 + 호수로 구분
function propertyLabel(p: PropertyRow): string {
  const addr  = shortAddr(p.road_address)
  const sub   = [p.building_name, p.building_dong, p.unit_number]
    .filter(Boolean)
    .join(' ')
  return sub ? `${addr} · ${sub}` : addr
}

// ─── 납부 미리보기 ────────────────────────────────────────
function PaymentPreview({ dealType, price, deposit, monthly }: {
  dealType: string; price: number; deposit: number; monthly: number
}) {
  const base = price || deposit
  if (!base && !monthly) return null

  let items: Array<{ label: string; amount: number }> = []
  if (dealType === '매매') {
    const down = Math.round(base * 0.1)
    const mid  = Math.round(base * 0.2)
    items = [
      { label: '계약금 (10%)', amount: down },
      { label: '중도금 (20%)', amount: mid },
      { label: `잔금 (70%)`,   amount: base - down - mid },
    ]
  } else if (dealType === '전세') {
    const down = Math.round(base * 0.1)
    items = [
      { label: '계약금 (10%)', amount: down },
      { label: '잔금 (90%)',   amount: base - down },
    ]
  } else {
    items = [
      { label: '보증금', amount: deposit },
      { label: '월세',   amount: monthly },
    ]
  }

  return (
    <div style={S.paymentPreview}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)', marginBottom: 6 }}>
        납부 단계 미리보기
      </div>
      {items.map((it) => (
        <div key={it.label} style={S.paymentRow}>
          <span style={{ color: 'rgba(0,0,0,0.5)' }}>{it.label}</span>
          <span style={{ fontWeight: 600 }}>{fmtPrice(it.amount)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── 거래 등록 폼 ────────────────────────────────────────
interface TransactionFormProps {
  properties: PropertyRow[]
  onClose: () => void
  onSaved: () => void
}

function TransactionForm({ properties, onClose, onSaved }: TransactionFormProps) {
  const [propId,    setPropId]    = useState('')
  const [dealType,  setDealType]  = useState('매매')
  const [price,     setPrice]     = useState('')
  const [deposit,   setDeposit]   = useState('')
  const [monthly,   setMonthly]   = useState('')
  const [contractD, setContractD] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const priceNum   = Number(price.replace(/,/g, ''))   || 0
  const depositNum = Number(deposit.replace(/,/g, '')) || 0
  const monthlyNum = Number(monthly.replace(/,/g, '')) || 0

  async function handleSave() {
    if (!propId)   { setError('매물을 선택해 주세요.'); return }
    if (!dealType) { setError('거래유형을 선택해 주세요.'); return }
    if (contractD && endDate && endDate < contractD) {
      setError('종료일은 계약일보다 빠를 수 없습니다.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload: SaveTransactionPayload = {
        property_id:   propId,
        deal_type:     dealType,
        price:         priceNum   || undefined,
        deposit:       depositNum || undefined,
        monthly_rent:  monthlyNum || undefined,
        contract_date: contractD  || undefined,
        end_date:      endDate    || undefined,
      }
      const { id } = await saveTransaction(payload)
      await createDefaultPayments(id, {
        deal_type:    dealType,
        price:        priceNum   || undefined,
        deposit:      depositNum || undefined,
        monthly_rent: monthlyNum || undefined,
      })
      onSaved()
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const showPrice   = dealType === '매매'
  const showDeposit = dealType === '전세' || dealType === '월세' || dealType === '단기임대'
  const showMonthly = dealType === '월세' || dealType === '단기임대'

  return (
    <div style={S.overlay}>
      <div style={S.modal} data-testid="transaction-form">
        <div style={S.modalTitle}>거래 등록</div>

        {/* 매물 선택 */}
        <div style={S.formField}>
          <label htmlFor="tx-property" style={S.label}>매물 *</label>
          <select
            id="tx-property"
            aria-label="매물"
            style={S.formSelect}
            value={propId}
            onChange={(e) => setPropId(e.target.value)}
          >
            <option value="">매물 선택</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{propertyLabel(p)}</option>
            ))}
          </select>
        </div>

        {/* 거래유형 */}
        <div style={S.formField}>
          <label htmlFor="tx-deal-type" style={S.label}>거래유형 *</label>
          <select
            id="tx-deal-type"
            aria-label="거래유형"
            style={S.formSelect}
            value={dealType}
            onChange={(e) => setDealType(e.target.value)}
          >
            {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* 금액 필드 */}
        <div style={S.formGrid}>
          {showPrice && (
            <div>
              <label htmlFor="tx-price" style={S.label}>거래금액 (원)</label>
              <input
                id="tx-price"
                aria-label="거래금액"
                style={S.input}
                type="number"
                placeholder="500000000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          )}
          {showDeposit && (
            <div>
              <label htmlFor="tx-deposit" style={S.label}>보증금 (원)</label>
              <input
                id="tx-deposit"
                aria-label="보증금"
                style={S.input}
                type="number"
                placeholder="100000000"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
            </div>
          )}
          {showMonthly && (
            <div>
              <label htmlFor="tx-monthly" style={S.label}>월세 (원)</label>
              <input
                id="tx-monthly"
                aria-label="월세"
                style={S.input}
                type="number"
                placeholder="1000000"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
              />
            </div>
          )}
          {/* 거래금액 placeholder — 전세/월세 시 공간 유지 */}
          {!showPrice && !showDeposit && (
            <div>
              <label htmlFor="tx-price" style={S.label}>거래금액 (원)</label>
              <input
                id="tx-price"
                aria-label="거래금액"
                style={S.input}
                type="number"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* 납부 미리보기 */}
        <PaymentPreview
          dealType={dealType}
          price={priceNum}
          deposit={depositNum}
          monthly={monthlyNum}
        />

        {/* 기간 */}
        <div style={{ ...S.formGrid, marginTop: 16 }}>
          <div>
            <label htmlFor="tx-contract-date" style={S.label}>계약일</label>
            <input
              id="tx-contract-date"
              aria-label="계약일"
              style={S.input}
              type="date"
              value={contractD}
              onChange={(e) => {
                const v = e.target.value
                setContractD(v)
                if (endDate && v && endDate < v) {
                  setError('종료일은 계약일보다 빠를 수 없습니다.')
                } else {
                  setError('')
                }
              }}
            />
          </div>
          <div>
            <label htmlFor="tx-end-date" style={S.label}>종료일</label>
            <input
              id="tx-end-date"
              aria-label="종료일"
              style={S.input}
              type="date"
              min={contractD || undefined}
              value={endDate}
              onChange={(e) => {
                const v = e.target.value
                if (contractD && v && v < contractD) {
                  setError('종료일은 계약일보다 빠를 수 없습니다.')
                } else {
                  setError('')
                }
                setEndDate(v)
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#ff3b30', marginTop: 8 }}>{error}</div>
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

// ─── 거래 메모 패널 ──────────────────────────────────────
interface TransactionPanelProps {
  row: TransactionRow
  onClose: () => void
  onWarningChange: (id: string) => void
  onUpdated: () => void
  onDelete: (row: TransactionRow) => void
}

function TransactionPanel({ row, onClose, onWarningChange, onUpdated, onDelete }: TransactionPanelProps) {
  const [memos, setMemos] = useState<TransactionMemoRow[]>([])
  const [status, setStatus] = useState(row.status)
  const [saving, setSaving] = useState(false)

  const loadMemos = useCallback(async () => {
    try { setMemos(await getTransactionMemos(row.id)) } catch { /* 무시 */ }
  }, [row.id])

  useEffect(() => { loadMemos() }, [loadMemos])

  async function handleSaveMemo(payload: MemoSavePayload) {
    await addTransactionMemo(row.id, payload)
    await loadMemos()
    if (payload.type === 'warning' || payload.type === 'dispute') {
      onWarningChange(row.id)
    }
  }

  async function handleDeleteMemo(memoId: string) {
    await deleteTransactionMemo(memoId)
    await loadMemos()
  }

  async function handleSaveStatus() {
    setSaving(true)
    try {
      await updateTransaction(row.id, { status })
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.panel(true)}>
      <div style={S.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={S.panelTitle}>거래 상세</span>
          {row.warning && <span style={S.warningBadge}>경고</span>}
        </div>
        <button style={S.closeBtn} aria-label="닫기" onClick={onClose}>×</button>
      </div>
      <div style={S.panelBody}>
        <div style={S.panelSection}>
          <div style={S.panelLabel}>매물 주소</div>
          <div style={S.panelValue}>{row.property_road_address}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={S.panelLabel}>거래유형</div>
            <div style={S.panelValue}>{row.deal_type}</div>
          </div>
          <div>
            <div style={S.panelLabel}>상태</div>
            <select
              style={S.formSelect}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="거래 상태"
            >
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <div style={S.panelLabel}>금액</div>
            <div style={S.panelValue}>{fmtPrice(row.price)}</div>
          </div>
          <div>
            <div style={S.panelLabel}>계약일</div>
            <div style={S.panelValue}>{row.contract_date ?? '—'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 20 }}>
          <button style={S.saveBtn} disabled={saving} onClick={handleSaveStatus}>
            {saving ? '저장 중...' : '상태 저장'}
          </button>
          <button style={{ ...S.cancelBtn, color: '#ff3b30' }} onClick={() => onDelete(row)}>
            삭제
          </button>
        </div>
        <div style={S.panelSection}>
          <div style={S.panelLabel}>메모</div>
          <MemoSection
            memos={memos}
            onSave={handleSaveMemo}
            onDelete={handleDeleteMemo}
          />
        </div>
      </div>
    </div>
  )
}

// ─── 페이지 ──────────────────────────────────────────────
export default function TransactionsPage() {
  const [rows,        setRows]        = useState<TransactionRow[]>([])
  const [properties,  setProperties]  = useState<PropertyRow[]>([])
  const [loading,     setLoading]     = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const [selectedRow, setSelectedRow] = useState<TransactionRow | null>(null)
  const [deleting,    setDeleting]    = useState<TransactionRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [search,      setSearch]      = useState('')
  const [sort, setSort] = useState<SortState<TransactionSortKey>>({ key: 'contractDate', direction: 'desc' })
  const debouncedSearch = useDebounce(search)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const [txs, props] = await Promise.all([listTransactions(), listProperties()])
      setRows(txs)
      setProperties(props)
    } catch {
      // 조회 실패 시 빈 목록 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  const filteredRows = rows.filter((row) => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return true
    return [row.property_road_address, row.status, row.deal_type]
      .some((value) => value.toLowerCase().includes(q))
  })
  const sortedRows = [...filteredRows].sort((a, b) => {
    switch (sort.key) {
      case 'property': return compareText(a.property_road_address, b.property_road_address, sort.direction)
      case 'dealType': return compareText(a.deal_type, b.deal_type, sort.direction)
      case 'status': return compareText(a.status, b.status, sort.direction)
      case 'price': return compareNumber(a.price, b.price, sort.direction)
      case 'contractDate': return compareDate(a.contract_date, b.contract_date, sort.direction)
      case 'endDate': return compareDate(a.end_date, b.end_date, sort.direction)
    }
  })
  const visibleIds = sortedRows.map((row) => row.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

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
    await Promise.all(ids.map((id) => deleteTransaction(id)))
    setBulkDeleting(false)
    setSelectedIds(new Set())
    setSelectedRow((prev) => (prev && ids.includes(prev.id) ? null : prev))
    await loadList()
  }

  return (
    <>
      <Header title="거래 관리" />
      <main style={S.main}>

        {/* 툴바 */}
        <div style={S.toolbar}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>
            거래 현황 {filteredRows.length > 0 ? `(${filteredRows.length})` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="주소, 상태 검색" label="거래 검색" />
            <button
              style={S.addBtn}
              aria-label="거래 등록"
              onClick={() => setShowForm(true)}
            >
              + 거래 등록
            </button>
            {selectedIds.size > 0 && (
              <>
                <button style={S.cancelBtn} type="button" onClick={() => setSelectedIds(new Set())}>
                  선택 해제
                </button>
                <button style={{ ...S.cancelBtn, color: '#ff3b30' }} type="button" onClick={() => setBulkDeleting(true)}>
                  선택 {selectedIds.size}개 삭제
                </button>
              </>
            )}
          </div>
        </div>

        {/* 리스트 */}
        <div style={S.card}>
          {loading ? (
            <div style={{ ...S.empty, padding: '40px 0' }}>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>불러오는 중…</div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={S.empty}>
              <div style={S.emptyIcon}>🤝</div>
              <div style={S.emptyTitle}>등록된 거래가 없습니다</div>
              <div style={S.emptyDesc}>새 거래를 등록하면 납부 단계가 자동으로 생성됩니다.</div>
            </div>
          ) : (
            <div style={S.tableScroll}>
            <table style={{ ...S.table, minWidth: 920 }}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 36, left: 0, zIndex: 3 }}>
                    <input
                      aria-label="select-all-transactions"
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <SortableHeader style={S.th} label="매물" sortKey="property" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="거래유형" sortKey="dealType" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="상태" sortKey="status" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="금액" sortKey="price" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="계약일" sortKey="contractDate" sort={sort} onSort={setSort} />
                  <SortableHeader style={S.th} label="종료일" sortKey="endDate" sort={sort} onSort={setSort} />
                  <th style={S.th}>관리</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRow(r)}>
                    <td style={{ ...S.td, width: 36, position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                      <input
                        aria-label={`select-transaction-${r.id}`}
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleSelected(r.id)}
                      />
                    </td>
                    <td style={S.td}>
                      {shortAddr(r.property_road_address)}
                      {r.warning && <span style={{ ...S.warningBadge, marginLeft: 6 }}>경고</span>}
                    </td>
                    <td style={S.td}>{r.deal_type}</td>
                    <td style={S.td}>
                      <span style={S.statusBadge(r.status)}>{r.status}</span>
                    </td>
                    <td style={S.td}>{fmtPrice(r.price)}</td>
                    <td style={S.td}>{r.contract_date ?? '-'}</td>
                    <td style={S.td}>{r.end_date ?? '-'}</td>
                    <td style={S.td}>
                      <button
                        style={S.cancelBtn}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedRow(r)
                        }}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

      </main>

      {/* 거래 등록 폼 */}
      {showForm && (
        <TransactionForm
          properties={properties}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadList() }}
        />
      )}

      {/* 거래 메모 패널 */}
      {selectedRow && (
        <TransactionPanel
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onUpdated={() => {
            setSelectedRow(null)
            loadList()
          }}
          onDelete={(row) => setDeleting(row)}
          onWarningChange={(id) => {
            // 목록의 warning 플래그를 낙관적으로 업데이트
            setRows((prev) =>
              prev.map((r) => r.id === id ? { ...r, warning: true } : r)
            )
            // selectedRow도 갱신
            setSelectedRow((prev) => prev ? { ...prev, warning: true } : prev)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="거래를 삭제할까요?"
          description={`${deleting.property_road_address} 거래가 삭제됩니다.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteTransaction(deleting.id)
            setDeleting(null)
            setSelectedRow(null)
            await loadList()
          }}
        />
      )}
      {bulkDeleting && (
        <ConfirmDialog
          title="선택 거래를 삭제할까요?"
          description={`${selectedIds.size}개 거래가 삭제됩니다.`}
          confirmLabel="삭제"
          cancelLabel="취소"
          onCancel={() => setBulkDeleting(false)}
          onConfirm={handleBulkDelete}
        />
      )}
    </>
  )
}
