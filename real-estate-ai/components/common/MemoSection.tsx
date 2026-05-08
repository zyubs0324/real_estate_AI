'use client'

/**
 * MemoSection — 공용 댓글형 메모 컴포넌트
 * apple.md §14 — 카드 내부 섹션
 * U3-11 fix
 *
 * 각 메모: 날짜(yyyy.mm.dd) | 타입 배지 | 내용 | 삭제(×) 한 줄
 * 저장 → onSave 호출 → 입력창 초기화
 * 삭제 → onDelete(id) 호출
 */

import { useState } from 'react'

// ─── 타입 ───────────────────────────────────────────────
export interface MemoRow {
  id: string
  content: string
  type: 'normal' | 'warning' | 'dispute'
  created_at: string
}

export interface MemoSavePayload {
  content: string
  type: 'normal' | 'warning' | 'dispute'
}

interface MemoSectionProps {
  memos: MemoRow[]
  onSave: (payload: MemoSavePayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// ─── 날짜 포맷 (2026.05.07) ──────────────────────────
function formatDate(isoString: string): string {
  const [datePart] = isoString.split('T')
  const [y, m, d] = datePart.split('-')
  return `${y}.${m}.${d}`
}

// ─── 타입 레이블 / 색상 ──────────────────────────────
const TYPE_LABEL: Record<MemoRow['type'], string> = {
  normal:  '일반',
  warning: '주의',
  dispute: '분쟁',
}

const TYPE_COLOR: Record<MemoRow['type'], string> = {
  normal:  '#636366',
  warning: '#ff9f0a',
  dispute: '#ff3b30',
}

// ─── 스타일 ─────────────────────────────────────────
const S = {
  emptyText: {
    fontSize: 13, color: 'rgba(0,0,0,0.35)',
    textAlign: 'center' as const, padding: '16px 0',
  },
  memoList: { listStyle: 'none', padding: 0, margin: '0 0 16px' },
  memoRow: {
    display: 'flex' as const, alignItems: 'center' as const,
    gap: 8, padding: '6px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  dateText: { fontSize: 12, color: 'rgba(0,0,0,0.40)', flexShrink: 0 },
  badge: (type: MemoRow['type']) => ({
    fontSize: 11, fontWeight: 700 as const, flexShrink: 0,
    padding: '1px 6px', borderRadius: 4,
    background: `${TYPE_COLOR[type]}20`,
    color: TYPE_COLOR[type],
  }),
  content: { fontSize: 13, color: '#1d1d1f', flex: 1 },
  deleteBtn: {
    background: 'transparent', border: 'none',
    cursor: 'pointer' as const, color: 'rgba(0,0,0,0.35)',
    fontSize: 14, padding: '0 4px', lineHeight: 1,
    fontFamily: 'inherit', flexShrink: 0,
  },
  form: { display: 'flex' as const, flexDirection: 'column' as const, gap: 8 },
  textarea: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)', fontSize: 13,
    color: '#1d1d1f', background: '#f5f5f7', resize: 'vertical' as const,
    fontFamily: 'inherit', minHeight: 68, boxSizing: 'border-box' as const,
  },
  typeRow: { display: 'flex' as const, gap: 6, alignItems: 'center' as const },
  typeBtn: (selected: boolean, type: MemoRow['type']) => ({
    padding: '4px 10px', borderRadius: 6, border: 'none',
    fontSize: 12, fontWeight: 600 as const, cursor: 'pointer' as const, fontFamily: 'inherit',
    background: selected ? TYPE_COLOR[type] : '#f5f5f7',
    color: selected ? '#ffffff' : TYPE_COLOR[type],
    outline: selected ? `2px solid ${TYPE_COLOR[type]}` : 'none',
  }),
  saveBtn: (saving: boolean) => ({
    marginLeft: 'auto' as const, padding: '6px 16px', borderRadius: 8,
    border: 'none', background: '#0071e3', color: '#ffffff',
    fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' as const,
    fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
  }),
  errorText: { fontSize: 12, color: '#ff3b30', marginTop: 4 },
}

// ─── 컴포넌트 ────────────────────────────────────────
export default function MemoSection({ memos, onSave, onDelete }: MemoSectionProps) {
  const [content,  setContent]  = useState('')
  const [type,     setType]     = useState<MemoRow['type']>('normal')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const TYPES: MemoRow['type'][] = ['normal', 'warning', 'dispute']

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave({ content: content.trim(), type })
      setContent('')
      setType('normal')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`메모 저장에 실패했습니다. (${msg})`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await onDelete(id)
    } catch {
      /* 삭제 오류는 부모가 처리 */
    }
  }

  return (
    <div>
      {/* 메모 목록 */}
      {memos.length === 0 ? (
        <p style={S.emptyText}>등록된 메모가 없습니다</p>
      ) : (
        <ul style={S.memoList}>
          {memos.map((m) => (
            <li key={m.id} style={S.memoRow}>
              <span style={S.dateText}>{formatDate(m.created_at)}</span>
              <span style={S.badge(m.type)}>{TYPE_LABEL[m.type]}</span>
              <span style={S.content}>{m.content}</span>
              <button
                style={S.deleteBtn}
                aria-label="삭제"
                onClick={() => handleDelete(m.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 입력 폼 */}
      <div style={S.form}>
        <textarea
          style={S.textarea}
          placeholder="메모 내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div style={S.typeRow}>
          {TYPES.map((t) => (
            <button
              key={t}
              aria-label={TYPE_LABEL[t]}
              style={S.typeBtn(type === t, t)}
              onClick={() => setType(t)}
            >
              ●
            </button>
          ))}
          <button
            style={S.saveBtn(saving)}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
        {error && <p style={S.errorText}>{error}</p>}
      </div>
    </div>
  )
}
