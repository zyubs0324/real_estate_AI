'use client'

// apple.md §14 — 일정 관리 페이지
// U3-8: 일정 등록 + D-1 이메일 알림

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import SearchInput from '@/components/common/SearchInput'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { deleteSchedule, listSchedules, saveSchedule, updateSchedule, type ScheduleRow, type SaveSchedulePayload } from '@/lib/supabase/schedules'

// ─── 상수 ─────────────────────────────────────────────────
const SCHEDULE_TYPES = ['계약', '잔금', '현장미팅', '서류', '기타']

const TYPE_COLOR: Record<string, string> = {
  '계약':    '#0071e3',
  '잔금':    '#34c759',
  '현장미팅':'#ff9f0a',
  '서류':    '#636366',
  '기타':    '#636366',
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
  listScroll: {
    overflow: 'auto' as const,
    width: '100%',
    maxHeight: 'calc(100vh - 300px)',
    scrollbarGutter: 'stable' as const,
  },
  empty: {
    display: 'flex' as const, flexDirection: 'column' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    padding: '80px 0', gap: 12,
  },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1d1d1f' },
  emptyDesc:  { fontSize: 13, color: 'rgba(0,0,0,0.4)', textAlign: 'center' as const },
  // 일정 카드 리스트
  schedList: { display: 'flex' as const, flexDirection: 'column' as const, gap: 12 },
  schedCard: (done: boolean): React.CSSProperties => ({
    display: 'flex' as const, alignItems: 'flex-start' as const, gap: 16,
    padding: '16px 20px', borderRadius: 10,
    background: done ? '#f5f5f7' : '#ffffff',
    boxShadow: done ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
    opacity: done ? 0.6 : 1,
  }),
  typeDot: (type: string): React.CSSProperties => ({
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6,
    background: TYPE_COLOR[type] ?? '#636366',
  }),
  schedTitle: (done: boolean): React.CSSProperties => ({
    fontSize: 14, fontWeight: 600, color: '#1d1d1f',
    textDecoration: done ? 'line-through' : 'none',
  }),
  schedMeta: { fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 3 },
  typeBadge: (type: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
    fontSize: 11, fontWeight: 700,
    background: `${TYPE_COLOR[type] ?? '#636366'}18`,
    color: TYPE_COLOR[type] ?? '#636366',
    marginLeft: 6,
  }),
  // 모달
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.3)',
    display: 'flex' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, zIndex: 100,
  },
  modal: {
    background: '#ffffff', borderRadius: 16, padding: '28px 32px',
    width: '100%', maxWidth: 480,
    boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: 20 },
  formField:  { marginBottom: 16 },
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
  textarea: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)', fontSize: 14,
    color: '#1d1d1f', background: '#f5f5f7',
    boxSizing: 'border-box' as const, fontFamily: 'inherit',
    resize: 'vertical' as const, minHeight: 80,
  },
  formSelect: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)', fontSize: 14,
    color: '#1d1d1f', background: '#ffffff', fontFamily: 'inherit',
  },
  modalFooter: {
    display: 'flex' as const, justifyContent: 'flex-end' as const, gap: 8, marginTop: 24,
  },
  cancelBtn: {
    padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
    background: '#ffffff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '9px 22px', borderRadius: 8, border: 'none',
    background: '#0071e3', color: '#ffffff',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  cronHint: {
    marginTop: 16, padding: '10px 14px', borderRadius: 8,
    background: 'rgba(0,113,227,0.06)', fontSize: 12,
    color: 'rgba(0,0,0,0.5)', lineHeight: 1.6,
  },
}

// ─── 날짜 포맷 ─────────────────────────────────────────────
function fmtDatetime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul',
  })
}

function dDay(iso: string): string {
  const now  = new Date(); now.setHours(0, 0, 0, 0)
  const due  = new Date(iso); due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - now.getTime()) / 86_400_000)
  if (diff === 0) return 'D-Day'
  if (diff > 0)  return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

// ─── 일정 등록 폼 ─────────────────────────────────────────
interface ScheduleFormProps {
  editData?: ScheduleRow
  onClose: () => void
  onSaved: () => void
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

function ScheduleForm({ editData, onClose, onSaved }: ScheduleFormProps) {
  const [title,  setTitle]  = useState(editData?.title ?? '')
  const [type,   setType]   = useState(editData?.schedule_type ?? '계약')
  const [dueDate,setDueDate]= useState(editData ? toDatetimeLocal(editData.due_date) : '')
  const [memo,   setMemo]   = useState(editData?.memo ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('제목을 입력해 주세요.'); return }
    if (!dueDate)       { setError('일시를 선택해 주세요.'); return }
    setSaving(true); setError('')
    try {
      const payload: SaveSchedulePayload = {
        title:         title.trim(),
        schedule_type: type,
        due_date:      new Date(dueDate).toISOString(),
        memo:          memo.trim() || undefined,
      }
      if (editData) await updateSchedule(editData.id, payload)
      else await saveSchedule(payload)
      onSaved()
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal} data-testid="schedule-form">
        <div style={S.modalTitle}>{editData ? '일정 수정' : '일정 등록'}</div>

        {/* 제목 */}
        <div style={S.formField}>
          <label htmlFor="sched-title" style={S.label}>제목</label>
          <input
            id="sched-title"
            aria-label="제목"
            style={S.input}
            type="text"
            placeholder="예: 옥수로 100 잔금 처리"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 유형 */}
        <div style={S.formField}>
          <label htmlFor="sched-type" style={S.label}>유형</label>
          <select
            id="sched-type"
            aria-label="유형"
            style={S.formSelect}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {SCHEDULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* 일시 */}
        <div style={S.formField}>
          <label htmlFor="sched-due" style={S.label}>일시</label>
          <input
            id="sched-due"
            aria-label="일시"
            style={S.input}
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* 메모 */}
        <div style={S.formField}>
          <label htmlFor="sched-memo" style={S.label}>메모</label>
          <textarea
            id="sched-memo"
            aria-label="메모"
            style={S.textarea}
            placeholder="특이사항, 준비물 등"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        <div style={S.cronHint}>
          💡 등록한 일정의 D-1(전날)에 이메일 알림이 자동 발송됩니다.
          수동 테스트: <code>/api/cron/notify</code> 직접 호출
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

// ─── 페이지 ──────────────────────────────────────────────
export default function SchedulesPage() {
  const [rows,    setRows]    = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm,setShowForm]= useState(false)
  const [editing, setEditing] = useState<ScheduleRow | null>(null)
  const [deleting,setDeleting]= useState<ScheduleRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [search,  setSearch]  = useState('')
  const debouncedSearch = useDebounce(search)

  const reload = useCallback(async () => {
    setLoading(true)
    try { setRows(await listSchedules()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  function handleSaved() { setShowForm(false); reload() }
  function handleEditSaved() { setEditing(null); reload() }

  const filteredRows = rows.filter((row) => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return true
    return [row.title, row.memo ?? '', row.schedule_type]
      .some((value) => value.toLowerCase().includes(q))
  })
  const visibleIds = filteredRows.map((row) => row.id)
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
    await Promise.all(ids.map((id) => deleteSchedule(id)))
    setBulkDeleting(false)
    setSelectedIds(new Set())
    await reload()
  }

  return (
    <>
      <Header title="일정 관리" />
      <main style={S.main}>
        {/* 툴바 */}
        <div style={S.toolbar}>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>
            총 {filteredRows.length}건
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="제목, 메모 검색" label="일정 검색" />
            <button style={S.addBtn} onClick={() => setShowForm(true)}>
              + 일정 등록
            </button>
            {selectedIds.size > 0 && (
              <>
                <button style={S.cancelBtn} type="button" onClick={() => setSelectedIds(new Set())}>선택 해제</button>
                <button style={{ ...S.cancelBtn, color: '#ff3b30' }} type="button" onClick={() => setBulkDeleting(true)}>
                  선택 {selectedIds.size}개 삭제
                </button>
              </>
            )}
          </div>
        </div>

        {/* 일정 카드 리스트 */}
        {filteredRows.length > 0 && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#636366', marginBottom: 10 }}>
            <input
              aria-label="select-all-schedules"
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
            />
            현재 목록 전체 선택
          </label>
        )}

        <div style={S.card}>
          {loading ? (
            <div style={S.empty}>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>로딩 중…</div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={S.empty}>
              <span style={S.emptyIcon}>📅</span>
              <span style={S.emptyTitle}>등록된 일정이 없습니다</span>
              <span style={S.emptyDesc}>
                계약, 잔금, 현장 미팅 등 중요한 일정을 등록하면<br />
                D-1에 이메일 알림을 받을 수 있습니다.
              </span>
            </div>
          ) : (
            <div style={S.listScroll}>
            <div style={S.schedList}>
              {filteredRows.map((row) => (
                <div key={row.id} style={S.schedCard(row.is_done)}>
                  <input
                    aria-label={`select-schedule-${row.id}`}
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggleSelected(row.id)}
                  />
                  <div style={S.typeDot(row.schedule_type)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={S.schedTitle(row.is_done)}>{row.title}</span>
                      <span style={S.typeBadge(row.schedule_type)}>{row.schedule_type}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: row.is_done ? '#636366' : '#ff3b30',
                      }}>
                        {row.is_done ? '완료' : dDay(row.due_date)}
                      </span>
                    </div>
                    <div style={S.schedMeta}>
                      {fmtDatetime(row.due_date)}
                      {row.memo && ` · ${row.memo}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={S.cancelBtn} onClick={() => setEditing(row)}>수정</button>
                    <button style={{ ...S.cancelBtn, color: '#ff3b30' }} onClick={() => setDeleting(row)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <ScheduleForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
      {editing && (
        <ScheduleForm
          editData={editing}
          onClose={() => setEditing(null)}
          onSaved={handleEditSaved}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="일정을 삭제할까요?"
          description={`${deleting.title} 일정이 삭제됩니다.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteSchedule(deleting.id)
            setDeleting(null)
            await reload()
          }}
        />
      )}
      {bulkDeleting && (
        <ConfirmDialog
          title="선택 일정을 삭제할까요?"
          description={`${selectedIds.size}개 일정이 삭제됩니다.`}
          confirmLabel="삭제"
          cancelLabel="취소"
          onCancel={() => setBulkDeleting(false)}
          onConfirm={handleBulkDelete}
        />
      )}
    </>
  )
}
