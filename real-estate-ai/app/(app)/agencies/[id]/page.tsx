'use client'

// apple.md §14 — 타부동산 상세 페이지
// U3-10

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { getAgency, updateAgency, getAgencyMemos, addAgencyMemo, deleteAgencyMemo, type AgencyRow, type AgencyMemoRow } from '@/lib/supabase/agencies'
import MemoSection, { type MemoSavePayload } from '@/components/common/MemoSection'

// ─── 스타일 ────────────────────────────────────────────────
const S = {
  main: {
    flex: 1, overflowY: 'auto' as const, padding: '24px',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    background: '#f5f5f7', minHeight: '100vh',
  },
  card: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '28px 32px',
    maxWidth: 640, margin: '0 auto',
  },
  sectionTitle: {
    fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.48)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 16,
  },
  row: {
    display: 'flex' as const, borderBottom: '1px solid rgba(0,0,0,0.05)',
    padding: '10px 0', gap: 16,
  },
  rowLast: {
    display: 'flex' as const, padding: '10px 0', gap: 16,
  },
  label: { fontSize: 13, color: 'rgba(0,0,0,0.48)', width: 80, flexShrink: 0 },
  value: { fontSize: 14, color: '#1d1d1f', flex: 1 },
  emptyValue: { fontSize: 14, color: 'rgba(0,0,0,0.28)', flex: 1 },
  toolbar: {
    maxWidth: 640, margin: '0 auto 16px',
    display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
  },
  backBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer' as const,
    fontSize: 14, color: '#0071e3', padding: 0, fontFamily: 'inherit',
    display: 'flex' as const, alignItems: 'center' as const, gap: 4,
  },
  editBtn: {
    background: '#0071e3', color: '#fff', border: 'none',
    borderRadius: 8, padding: '8px 16px', fontSize: 13,
    fontWeight: 600, cursor: 'pointer' as const, fontFamily: 'inherit',
  },
  input: {
    width: '100%', boxSizing: 'border-box' as const,
    border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8,
    padding: '8px 12px', fontSize: 14, color: '#1d1d1f',
    fontFamily: 'inherit', outline: 'none',
  },
  actions: { display: 'flex' as const, gap: 8, marginTop: 24, justifyContent: 'flex-end' as const },
  btnGhost: {
    background: 'transparent', color: '#636366', border: 'none',
    borderRadius: 6, padding: '6px 12px', fontSize: 13,
    cursor: 'pointer' as const, fontFamily: 'inherit',
  },
  errorText: { fontSize: 13, color: '#ff3b30', marginTop: 10 },
}

// ─── 상세 뷰 ─────────────────────────────────────────────
function DetailField({
  label, value, last,
}: { label: string; value: string | null; last?: boolean }) {
  return (
    <div style={last ? S.rowLast : S.row}>
      <span style={S.label}>{label}</span>
      {value
        ? <span style={S.value}>{value}</span>
        : <span style={S.emptyValue}>—</span>
      }
    </div>
  )
}

// ─── 편집 폼 ─────────────────────────────────────────────
interface EditFormProps {
  agency:   AgencyRow
  onCancel: () => void
  onSaved:  (updated: AgencyRow) => void
}

function EditForm({ agency, onCancel, onSaved }: EditFormProps) {
  const [name,      setName]      = useState(agency.name)
  const [rep,       setRep]       = useState(agency.representative ?? '')
  const [phone,     setPhone]     = useState(agency.phone          ?? '')
  const [address,   setAddress]   = useState(agency.address        ?? '')
  const [licenseNo, setLicenseNo] = useState(agency.license_no     ?? '')
  const [notes,     setNotes]     = useState(agency.notes          ?? '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError('상호명을 입력하세요.'); return }
    setSaving(true)
    try {
      await updateAgency(agency.id, {
        name:           name.trim(),
        representative: rep.trim()      || undefined,
        phone:          phone.trim()    || undefined,
        address:        address.trim()  || undefined,
        license_no:     licenseNo.trim() || undefined,
        notes:          notes.trim()    || undefined,
      })
      onSaved({
        ...agency,
        name, representative: rep || null, phone: phone || null,
        address: address || null, license_no: licenseNo || null, notes: notes || null,
      })
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [name, rep, phone, address, licenseNo, notes, agency, onSaved])

  return (
    <div>
      {[
        { label: '상호명',   id: 'edit-name',    value: name,      setter: setName },
        { label: '대표자',   id: 'edit-rep',     value: rep,       setter: setRep },
        { label: '전화번호', id: 'edit-phone',   value: phone,     setter: setPhone },
        { label: '주소',     id: 'edit-address', value: address,   setter: setAddress },
        { label: '등록번호', id: 'edit-license', value: licenseNo, setter: setLicenseNo },
        { label: '비고',     id: 'edit-notes',   value: notes,     setter: setNotes },
      ].map(({ label, id, value, setter }) => (
        <div key={id} style={{ marginBottom: 14 }}>
          <label htmlFor={id} style={S.label}>{label}</label>
          <input
            id={id}
            style={S.input}
            value={value}
            onChange={(e) => setter(e.target.value)}
          />
        </div>
      ))}
      {error && <p style={S.errorText}>{error}</p>}
      <div style={S.actions}>
        <button style={S.btnGhost} onClick={onCancel}>취소</button>
        <button
          style={{ ...S.editBtn, opacity: saving ? 0.7 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}

// ─── 페이지 ──────────────────────────────────────────────
export default function AgencyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id     = typeof params.id === 'string' ? params.id : ''

  const [agency,    setAgency]    = useState<AgencyRow | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [memos, setMemos] = useState<AgencyMemoRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAgency(id)
      setAgency(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadMemos = useCallback(async () => {
    try { setMemos(await getAgencyMemos(id)) } catch { /* 무시 */ }
  }, [id])

  async function handleSaveMemo(payload: MemoSavePayload) {
    await addAgencyMemo(id, payload)
    await loadMemos()
  }

  async function handleDeleteMemo(memoId: string) {
    await deleteAgencyMemo(memoId)
    await loadMemos()
  }

  useEffect(() => { load() }, [load])
  useEffect(() => { loadMemos() }, [loadMemos])

  if (loading) {
    return (
      <>
        <Header title="타부동산 상세" />
        <main style={S.main}>
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(0,0,0,0.35)', fontSize: 14 }}>
            로딩 중…
          </div>
        </main>
      </>
    )
  }

  if (!agency) {
    return (
      <>
        <Header title="타부동산 상세" />
        <main style={S.main}>
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#ff3b30', fontSize: 14 }}>
            데이터를 찾을 수 없습니다.
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title={agency.name} />
      <main style={S.main}>
        <div style={S.toolbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={S.backBtn} onClick={() => router.push('/agencies')}>
              ← 목록으로
            </button>
            {agency.warning && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                background: '#ff3b3018', color: '#ff3b30',
              }}>경고</span>
            )}
          </div>
          {!editing && (
            <button style={S.editBtn} onClick={() => setEditing(true)}>
              편집
            </button>
          )}
        </div>

        <div style={S.card}>
          <p style={S.sectionTitle}>기본 정보</p>

          {editing ? (
            <EditForm
              agency={agency}
              onCancel={() => setEditing(false)}
              onSaved={(updated) => { setAgency(updated); setEditing(false) }}
            />
          ) : (
            <>
              <DetailField label="상호명"   value={agency.name} />
              <DetailField label="대표자"   value={agency.representative} />
              <DetailField label="전화번호" value={agency.phone} />
              <DetailField label="주소"     value={agency.address} />
              <DetailField label="등록번호" value={agency.license_no} />
              <DetailField label="비고"     value={agency.notes} last />
            </>
          )}
        </div>

        {/* 메모 카드 */}
        <div style={{ ...S.card, maxWidth: 640, margin: '0 auto' }}>
          <p style={S.sectionTitle}>메모</p>
          <MemoSection
            memos={memos}
            onSave={handleSaveMemo}
            onDelete={handleDeleteMemo}
          />
        </div>
      </main>
    </>
  )
}
