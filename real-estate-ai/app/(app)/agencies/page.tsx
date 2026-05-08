'use client'

// apple.md §14 — 타부동산 관리 카드 레이아웃
// U3-10: 목록 + 등록 폼 + 부동산중개업 API 자동 조회

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import {
  listAgencies,
  saveAgency,
  type AgencyRow,
  type SaveAgencyPayload,
} from '@/lib/supabase/agencies'
import { searchAgency } from '@/lib/apis/agency'

// ─── 스타일 ────────────────────────────────────────────────
const S = {
  main: {
    flex: 1, overflowY: 'auto' as const, padding: '24px',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    background: '#f5f5f7',
    minHeight: '100vh',
  },
  toolbar: {
    display: 'flex' as const, justifyContent: 'flex-end' as const,
    marginBottom: 20,
  },
  btnPrimary: {
    background: '#0071e3', color: '#fff', border: 'none',
    borderRadius: 8, padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer' as const,
    fontFamily: 'inherit',
  },
  btnSecondary: {
    background: 'rgba(0,0,0,0.06)', color: '#1d1d1f', border: 'none',
    borderRadius: 8, padding: '9px 18px', fontSize: 14,
    fontWeight: 500, cursor: 'pointer' as const,
    fontFamily: 'inherit',
  },
  btnGhost: {
    background: 'transparent', color: '#636366', border: 'none',
    borderRadius: 6, padding: '6px 12px', fontSize: 13,
    cursor: 'pointer' as const, fontFamily: 'inherit',
  },
  card: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 24px',
    marginBottom: 12,
  },
  agencyCard: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '16px 20px',
    marginBottom: 10, cursor: 'pointer' as const,
    display: 'flex' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    transition: 'box-shadow 150ms ease',
  },
  agencyName: { fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 2 },
  agencyMeta: { fontSize: 13, color: 'rgba(0,0,0,0.48)' },
  emptyBox: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '60px 24px', textAlign: 'center' as const,
    color: 'rgba(0,0,0,0.35)', fontSize: 14,
  },
  overlay: {
    position: 'fixed' as const, inset: 0,
    background: 'rgba(0,0,0,0.4)', zIndex: 200,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: '28px 32px',
    width: 480, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' as const,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: 20 },
  fieldGroup: { marginBottom: 14 },
  label: { display: 'block' as const, fontSize: 13, fontWeight: 500, color: '#1d1d1f', marginBottom: 4 },
  input: {
    width: '100%', boxSizing: 'border-box' as const,
    border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, color: '#1d1d1f',
    fontFamily: 'inherit', outline: 'none',
  },
  searchRow: {
    display: 'flex' as const, gap: 8, alignItems: 'flex-end' as const, marginBottom: 14,
  },
  searchGroup: { flex: 1 },
  divider: { borderTop: '1px solid rgba(0,0,0,0.08)', margin: '18px 0' },
  actions: { display: 'flex' as const, justifyContent: 'flex-end' as const, gap: 8, marginTop: 20 },
  errorText: { fontSize: 13, color: '#ff3b30', marginTop: 6 },
  badge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
    fontSize: 11, fontWeight: 600,
    background: 'rgba(0,113,227,0.10)', color: '#0071e3',
  },
  warningBadge: {
    display: 'inline-block', padding: '2px 7px', borderRadius: 6,
    fontSize: 11, fontWeight: 700,
    background: '#ff3b3018', color: '#ff3b30',
  },
}

// ─── 등록 폼 ──────────────────────────────────────────────
interface AgencyFormProps {
  onClose: () => void
  onSaved: () => void
}

function AgencyForm({ onClose, onSaved }: AgencyFormProps) {
  const [name,      setName]      = useState('')
  const [licenseNo, setLicenseNo] = useState('')
  const [rep,       setRep]       = useState('')
  const [phone,     setPhone]     = useState('')
  const [address,   setAddress]   = useState('')
  const [notes,     setNotes]     = useState('')

  const [searching, setSearching] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [apiMsg,    setApiMsg]    = useState('')

  const handleSearch = useCallback(async () => {
    if (!name && !licenseNo) {
      setError('상호명 또는 등록번호를 입력하세요.')
      return
    }
    setError('')
    setApiMsg('')
    setSearching(true)
    try {
      const result = await searchAgency({ name: name || undefined, license_no: licenseNo || undefined })
      if (!result) {
        setApiMsg('조회 결과가 없습니다.')
        return
      }
      if (result.name)           setName(result.name)
      if (result.representative) setRep(result.representative)
      if (result.phone)          setPhone(result.phone)
      if (result.address)        setAddress(result.address)
      if (result.license_no)     setLicenseNo(result.license_no)
      setApiMsg('자동 조회 완료')
    } catch {
      setApiMsg('조회 중 오류가 발생했습니다.')
    } finally {
      setSearching(false)
    }
  }, [name, licenseNo])

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError('상호명을 입력하세요.'); return }
    setError('')
    setSaving(true)
    try {
      const payload: SaveAgencyPayload = {
        name:           name.trim(),
        representative: rep.trim()      || undefined,
        phone:          phone.trim()    || undefined,
        address:        address.trim()  || undefined,
        license_no:     licenseNo.trim() || undefined,
        notes:          notes.trim()    || undefined,
      }
      await saveAgency(payload)
      onSaved()
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [name, rep, phone, address, licenseNo, notes, onSaved])

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} data-testid="agency-form" onClick={(e) => e.stopPropagation()}>
        <p style={S.modalTitle}>타부동산 등록</p>

        {/* 자동 조회 섹션 */}
        <div style={S.searchRow}>
          <div style={S.searchGroup}>
            <label htmlFor="agency-name" style={S.label}>상호명</label>
            <input
              id="agency-name"
              style={S.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 한강공인중개사사무소"
            />
          </div>
        </div>

        <div style={S.searchRow}>
          <div style={S.searchGroup}>
            <label htmlFor="agency-license" style={S.label}>등록번호</label>
            <input
              id="agency-license"
              style={S.input}
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              placeholder="예: 11140-2023-01234"
            />
          </div>
          <button
            style={{
              ...S.btnSecondary,
              opacity: searching ? 0.6 : 1,
              whiteSpace: 'nowrap' as const,
            }}
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? '조회 중…' : '자동 조회'}
          </button>
        </div>

        {apiMsg && (
          <p style={{ fontSize: 13, color: apiMsg === '자동 조회 완료' ? '#34c759' : '#ff9f0a', marginBottom: 12 }}>
            {apiMsg}
          </p>
        )}

        <div style={S.divider} />

        {/* 상세 필드 */}
        <div style={S.fieldGroup}>
          <label htmlFor="agency-rep" style={S.label}>대표자</label>
          <input
            id="agency-rep"
            style={S.input}
            value={rep}
            onChange={(e) => setRep(e.target.value)}
            placeholder="대표 공인중개사명"
          />
        </div>

        <div style={S.fieldGroup}>
          <label htmlFor="agency-phone" style={S.label}>전화번호</label>
          <input
            id="agency-phone"
            style={S.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="02-0000-0000"
          />
        </div>

        <div style={S.fieldGroup}>
          <label htmlFor="agency-address" style={S.label}>주소</label>
          <input
            id="agency-address"
            style={S.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="사무소 주소"
          />
        </div>

        <div style={S.fieldGroup}>
          <label htmlFor="agency-notes" style={S.label}>비고</label>
          <input
            id="agency-notes"
            style={S.input}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="메모 (선택)"
          />
        </div>

        {error && <p style={S.errorText}>{error}</p>}

        <div style={S.actions}>
          <button style={S.btnGhost} onClick={onClose}>취소</button>
          <button
            style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 페이지 ──────────────────────────────────────────────
export default function AgenciesPage() {
  const router   = useRouter()
  const [agencies,   setAgencies]   = useState<AgencyRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listAgencies()
      setAgencies(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = useCallback(async () => {
    setShowForm(false)
    await load()
  }, [load])

  return (
    <>
      <Header title="타부동산" />
      <main style={S.main}>
        {/* 툴바 */}
        <div style={S.toolbar}>
          <button style={S.btnPrimary} onClick={() => setShowForm(true)}>
            타부동산 등록
          </button>
        </div>

        {/* 목록 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(0,0,0,0.35)', fontSize: 14 }}>
            로딩 중…
          </div>
        ) : agencies.length === 0 ? (
          <div style={S.emptyBox}>
            등록된 타부동산이 없습니다
          </div>
        ) : (
          agencies.map((ag) => (
            <div
              key={ag.id}
              style={S.agencyCard}
              onClick={() => router.push(`/agencies/${ag.id}`)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
              }}
            >
              <div>
                <p style={S.agencyName}>{ag.name}</p>
                <p style={S.agencyMeta}>
                  {ag.representative && <span>{ag.representative}　</span>}
                  {ag.phone && <span>{ag.phone}　</span>}
                  {ag.address && <span>{ag.address}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {ag.warning && <span style={S.warningBadge}>경고</span>}
                {ag.license_no && (
                  <span style={S.badge}>{ag.license_no}</span>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {showForm && (
        <AgencyForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
