'use client'

// apple.md §14 — 인물 관리 페이지
// U3-5: 인물 등록 + 동명인 감지

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { listPeople, savePerson, searchPeopleByName, searchPeopleByPhone, type PersonRow, type SavePersonPayload } from '@/lib/supabase/people'

// ─── 상수 ─────────────────────────────────────────────────
const ROLES = ['매도인', '매수인', '임대인', '임차인', '중개보조원', '기타']

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
  },
  pageTitle: { fontSize: 15, fontWeight: 700, color: '#1d1d1f' },
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
  // 모달
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
    maxWidth: 480,
    boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    position: 'relative' as const,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: 20 },
  formField:  { marginBottom: 16, position: 'relative' as const },
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
  // 동명인 드롭다운
  dupList: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 10,
    overflow: 'hidden' as const,
    marginTop: 2,
  },
  dupHeader: {
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(0,0,0,0.4)',
    background: '#f5f5f7',
  },
  dupItem: {
    padding: '10px 12px',
    fontSize: 13,
    cursor: 'pointer' as const,
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderBottom: '1px solid rgba(0,0,0,0.04)',
  },
  dupNewItem: {
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#0071e3',
    cursor: 'pointer' as const,
    textAlign: 'center' as const,
    background: 'rgba(0,113,227,0.04)',
  },
  dupName:  { fontWeight: 600, color: '#1d1d1f' },
  dupMeta:  { fontSize: 11, color: 'rgba(0,0,0,0.4)' },
  phoneDupHeader: {
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: '#ff3b30',
    background: 'rgba(255,59,48,0.06)',
  },
  warningBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: '#ff3b30',
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: 4,
  },
  // 폼 푸터
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

// ─── 인물 등록 폼 ────────────────────────────────────────
interface PersonFormProps {
  onClose: () => void
  onSaved: () => void
}

function PersonForm({ onClose, onSaved }: PersonFormProps) {
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [role,        setRole]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [dupList,     setDupList]     = useState<PersonRow[]>([])
  const [phoneDups,   setPhoneDups]   = useState<PersonRow[]>([])
  const nameTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 이름 입력 → 디바운스 후 동명인 검색
  function handleNameChange(value: string) {
    setName(value)
    if (nameTimer.current) clearTimeout(nameTimer.current)
    if (!value.trim()) { setDupList([]); return }
    nameTimer.current = setTimeout(async () => {
      try {
        const results = await searchPeopleByName(value)
        setDupList(results)
      } catch {
        setDupList([])
      }
    }, 300)
  }

  // Fix 1: 연락처 필드 포커스 시 동명인 드롭다운 닫기
  function handlePhoneFocus() {
    setDupList([])
  }

  // Fix 2: 전화번호 입력 → 디바운스 후 중복 검색
  function handlePhoneChange(value: string) {
    setPhone(value)
    if (phoneTimer.current) clearTimeout(phoneTimer.current)
    if (!value.trim()) { setPhoneDups([]); return }
    phoneTimer.current = setTimeout(async () => {
      try {
        const results = await searchPeopleByPhone(value)
        setPhoneDups(results)
      } catch {
        setPhoneDups([])
      }
    }, 300)
  }

  // 기존 인물 선택 → 폼 닫기 (상세 페이지 이동은 U3-6에서 연결)
  function handleSelectExisting(_person: PersonRow) {
    onClose()
  }

  async function handleSave() {
    if (!name.trim()) { setError('이름을 입력해 주세요.'); return }
    setSaving(true)
    setError('')
    try {
      const payload: SavePersonPayload = {
        name:  name.trim(),
        phone: phone.trim() || undefined,
        role:  role || undefined,
      }
      await savePerson(payload)
      onSaved()
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal} data-testid="person-form">
        <div style={S.modalTitle}>인물 등록</div>

        {/* 이름 + 동명인 드롭다운 */}
        <div style={S.formField}>
          <label htmlFor="person-name" style={S.label}>이름</label>
          <input
            id="person-name"
            aria-label="이름"
            style={S.input}
            type="text"
            placeholder="예: 김철수"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            autoComplete="off"
          />

          {/* 동명인 목록 */}
          {dupList.length > 0 && (
            <div style={S.dupList} data-testid="duplicate-list">
              <div style={S.dupHeader}>동명인 {dupList.length}명 — 기존 인물을 선택하거나 신규 등록하세요</div>
              {dupList.map((p) => (
                <div
                  key={p.id}
                  style={S.dupItem}
                  onClick={() => handleSelectExisting(p)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={S.dupName}>{p.name}</span>
                    {p.warning && <span style={S.warningBadge}>경고</span>}
                  </div>
                  <span style={S.dupMeta}>{p.role || '—'} · {p.phone || '연락처 없음'}</span>
                </div>
              ))}
              {/* 신규 등록 옵션 — 클릭 시 드롭다운 닫고 이름 유지 */}
              <div
                style={S.dupNewItem}
                data-testid="dup-new-person"
                onClick={() => setDupList([])}
              >
                + 신규 등록 (동명인과 다른 사람)
              </div>
            </div>
          )}
        </div>

        {/* 연락처 */}
        <div style={S.formField}>
          <label htmlFor="person-phone" style={S.label}>연락처</label>
          <input
            id="person-phone"
            aria-label="연락처"
            style={S.input}
            type="tel"
            placeholder="010-0000-0000"
            value={phone}
            onFocus={handlePhoneFocus}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />
          {/* Fix 2: 전화번호 중복 드롭다운 */}
          {phoneDups.length > 0 && (
            <div style={{ ...S.dupList, position: 'relative' }} data-testid="phone-duplicate-warning">
              <div style={S.phoneDupHeader}>⚠️ 이 번호로 이미 등록된 인물이 있습니다</div>
              {phoneDups.map((p) => (
                <div key={p.id} style={S.dupItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={S.dupName}>{p.name}</span>
                    {p.warning && <span style={S.warningBadge}>경고</span>}
                  </div>
                  <span style={S.dupMeta}>{p.role || '—'} · {p.phone}</span>
                </div>
              ))}
              {/* 번호 재사용 — 신규 등록 진행 */}
              <div
                style={S.dupNewItem}
                data-testid="phone-dup-new-person"
                onClick={() => setPhoneDups([])}
              >
                + 신규 등록 (번호 재사용 확인)
              </div>
            </div>
          )}
        </div>

        {/* 역할 */}
        <div style={S.formField}>
          <label htmlFor="person-role" style={S.label}>역할</label>
          <select
            id="person-role"
            aria-label="역할"
            style={S.formSelect}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">선택 (선택사항)</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
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

// ─── 페이지 ──────────────────────────────────────────────
export default function PeoplePage() {
  const router = useRouter()
  const [people,   setPeople]   = useState<PersonRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPeople()
      setPeople(data)
    } catch {
      // 조회 실패 시 빈 목록 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  return (
    <>
      <Header title="인물 관리" />
      <main style={S.main}>

        {/* 툴바 */}
        <div style={S.toolbar}>
          <div style={S.pageTitle}>등록 인물 {people.length > 0 ? `(${people.length})` : ''}</div>
          <button
            style={S.addBtn}
            aria-label="인물 등록"
            onClick={() => setShowForm(true)}
          >
            + 인물 등록
          </button>
        </div>

        {/* 리스트 카드 */}
        <div style={S.card}>
          {loading ? (
            <div style={{ ...S.empty, padding: '40px 0' }}>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>불러오는 중…</div>
            </div>
          ) : people.length === 0 ? (
            <div style={S.empty}>
              <div style={S.emptyIcon}>👤</div>
              <div style={S.emptyTitle}>등록된 인물이 없습니다</div>
              <div style={S.emptyDesc}>거래에 참여한 인물을 등록하면 여기에 표시됩니다.</div>
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>이름</th>
                  <th style={S.th}>역할</th>
                  <th style={S.th}>연락처</th>
                  <th style={S.th}>등록일</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/people/${p.id}`)}>
                    <td style={S.td}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      {p.warning && (
                        <span style={{ ...S.warningBadge, marginLeft: 6 }}>경고</span>
                      )}
                    </td>
                    <td style={S.td}>{p.role || '—'}</td>
                    <td style={S.td}>{p.phone || '—'}</td>
                    <td style={S.td}>{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>

      {/* 인물 등록 폼 모달 */}
      {showForm && (
        <PersonForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadList() }}
        />
      )}
    </>
  )
}
