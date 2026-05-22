'use client'

// apple.md §14 — 부동산 관리 카드 레이아웃
// U3-10: 목록 + 등록 폼 + 부동산중개업 API 자동 조회

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import SearchInput from '@/components/common/SearchInput'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useDebounce } from '@/lib/hooks/useDebounce'
import {
  deleteAgency,
  listAgencies,
  saveAgency,
  updateAgency,
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
  listScroll: {
    overflow: 'auto' as const,
    width: '100%',
    maxHeight: 'calc(100vh - 300px)',
    scrollbarGutter: 'stable' as const,
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
  ourOfficeBadge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
    fontSize: 11, fontWeight: 600,
    background: '#e3f0ff', color: '#0071e3',
  },
  trustBadge: {
    display: 'inline-block', padding: '2px 7px', borderRadius: 6,
    fontSize: 11, fontWeight: 600,
    background: '#e6f9ee', color: '#34c759',
  },
  cautionBadge: {
    display: 'inline-block', padding: '2px 7px', borderRadius: 6,
    fontSize: 11, fontWeight: 600,
    background: '#ff3b3018', color: '#ff3b30',
  },
  tagChip: {
    display: 'inline-block', padding: '1px 6px', borderRadius: 4,
    fontSize: 11, background: '#f5f5f7', color: '#636366',
  },
  countLink: {
    fontSize: 12, color: '#0071e3', background: 'none', border: 'none',
    cursor: 'pointer' as const, padding: 0, fontFamily: 'inherit',
    textDecoration: 'underline',
  },
  checkboxRow: {
    display: 'flex' as const, alignItems: 'center' as const, gap: 8, marginBottom: 14,
  },
  tagInputRow: {
    display: 'flex' as const, gap: 8, alignItems: 'center' as const,
  },
  tagList: {
    display: 'flex' as const, flexWrap: 'wrap' as const, gap: 4, marginTop: 6,
  },
  tagItem: {
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 4,
    padding: '1px 6px', borderRadius: 4, fontSize: 11,
    background: '#f5f5f7', color: '#636366',
  },
}

// ─── 등록 폼 ──────────────────────────────────────────────
interface AgencyFormProps {
  onClose: () => void
  onSaved: () => void
}

function AgencyForm({ onClose, onSaved }: AgencyFormProps) {
  const [name,        setName]       = useState('')
  const [licenseNo,   setLicenseNo]  = useState('')
  const [rep,         setRep]        = useState('')
  const [phone,       setPhone]      = useState('')
  const [address,     setAddress]    = useState('')
  const [notes,       setNotes]      = useState('')
  const [alias,       setAlias]      = useState('')
  const [isOurOffice, setIsOurOffice] = useState(false)
  const [trustLevel,  setTrustLevel] = useState('일반')
  const [tags,        setTags]       = useState<string[]>([])
  const [tagInput,    setTagInput]   = useState('')

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
        alias:          alias.trim()    || undefined,
        is_our_office:  isOurOffice,
        trust_level:    trustLevel,
        tags:           tags.length > 0 ? tags : undefined,
      }
      await saveAgency(payload)
      onSaved()
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [name, rep, phone, address, licenseNo, notes, alias, isOurOffice, trustLevel, tags, onSaved])

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} data-testid="agency-form" onClick={(e) => e.stopPropagation()}>
        <p style={S.modalTitle}>부동산 등록</p>

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

        <div style={S.fieldGroup}>
          <label htmlFor="agency-alias" style={S.label}>별칭 (선택)</label>
          <input
            id="agency-alias"
            style={S.input}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="짧은 별칭 (예: 한강부동산)"
          />
        </div>

        <div style={S.fieldGroup}>
          <label htmlFor="agency-trust" style={S.label}>신뢰 등급</label>
          <select
            id="agency-trust"
            style={{ ...S.input, appearance: 'auto' }}
            value={trustLevel}
            onChange={(e) => setTrustLevel(e.target.value)}
          >
            <option value="신뢰">신뢰</option>
            <option value="일반">일반</option>
            <option value="주의">주의</option>
          </select>
        </div>

        <div style={S.checkboxRow}>
          <input
            id="agency-our-office"
            type="checkbox"
            checked={isOurOffice}
            onChange={(e) => setIsOurOffice(e.target.checked)}
          />
          <label htmlFor="agency-our-office" style={{ ...S.label, marginBottom: 0, cursor: 'pointer' }}>
            우리사무소
          </label>
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>태그</label>
          <div style={S.tagInputRow}>
            <input
              style={{ ...S.input, flex: 1 }}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="태그 입력 후 추가"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const t = tagInput.trim()
                  if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
                  setTagInput('')
                }
              }}
            />
            <button
              type="button"
              style={S.btnSecondary}
              onClick={() => {
                const t = tagInput.trim()
                if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
                setTagInput('')
              }}
            >
              추가
            </button>
          </div>
          {tags.length > 0 && (
            <div style={S.tagList}>
              {tags.map((tag) => (
                <span key={tag} style={S.tagItem}>
                  {tag}
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#636366', padding: 0, fontSize: 12, lineHeight: 1 }}
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    aria-label={`태그 ${tag} 삭제`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
  const [deleting,   setDeleting]   = useState<AgencyRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [search,     setSearch]     = useState('')
  const debouncedSearch = useDebounce(search)

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

  const filteredAgencies = agencies.filter((agency) => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return true
    return [
      agency.name,
      agency.representative ?? '',
      agency.phone ?? '',
      agency.address ?? '',
      agency.license_no ?? '',
      agency.alias ?? '',
    ].some((value) => value.toLowerCase().includes(q))
  })
  const visibleIds = filteredAgencies.map((agency) => agency.id)
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
    await Promise.all(ids.map((id) => deleteAgency(id)))
    setBulkDeleting(false)
    setSelectedIds(new Set())
    await load()
  }

  return (
    <>
      <Header title="부동산" />
      <main style={S.main}>
        {/* 툴바 */}
        <div style={S.toolbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="상호, 대표, 등록번호 검색" label="부동산 검색" />
            <button style={S.btnPrimary} onClick={() => setShowForm(true)}>
              부동산 등록
            </button>
          </div>
        </div>

        {/* 목록 */}
        {filteredAgencies.length > 0 && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#636366', marginBottom: 10 }}>
            <input
              aria-label="select-all-agencies"
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
            />
            현재 목록 전체 선택
          </label>
        )}

        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
            <button style={S.btnGhost} type="button" onClick={() => setSelectedIds(new Set())}>선택 해제</button>
            <button style={{ ...S.btnGhost, color: '#ff3b30' }} type="button" onClick={() => setBulkDeleting(true)}>
              선택 {selectedIds.size}개 삭제
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(0,0,0,0.35)', fontSize: 14 }}>
            로딩 중…
          </div>
        ) : filteredAgencies.length === 0 ? (
          <div style={S.emptyBox}>
            등록된 부동산이 없습니다
          </div>
        ) : (
          <div style={S.listScroll}>
          {filteredAgencies.map((ag) => (
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
              <input
                aria-label={`select-agency-${ag.id}`}
                type="checkbox"
                checked={selectedIds.has(ag.id)}
                onClick={(event) => event.stopPropagation()}
                onChange={() => toggleSelected(ag.id)}
                style={{ marginRight: 10 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={S.agencyName}>
                  {ag.name}
                  {ag.alias && (
                    <span style={{ fontWeight: 400, color: '#636366', marginLeft: 6 }}>({ag.alias})</span>
                  )}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginBottom: 2 }}>
                  {ag.is_our_office && (
                    <span style={S.ourOfficeBadge}>우리사무소</span>
                  )}
                  {ag.trust_level === '신뢰' && (
                    <span style={S.trustBadge}>신뢰</span>
                  )}
                  {ag.trust_level === '주의' && (
                    <span style={S.cautionBadge}>주의</span>
                  )}
                  {ag.tags && ag.tags.length > 0 && ag.tags.map((tag) => (
                    <span key={tag} style={S.tagChip}>{tag}</span>
                  ))}
                </div>
                <p style={S.agencyMeta}>
                  {ag.representative && <span>{ag.representative}　</span>}
                  {ag.phone && <span>{ag.phone}　</span>}
                  {ag.address && <span>{ag.address}</span>}
                </p>
                {((ag.handling_count ?? 0) > 0 || (ag.co_broker_count ?? 0) > 0) && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    {(ag.handling_count ?? 0) > 0 && (
                      <button
                        style={S.countLink}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/properties?handlingAgencyId=${ag.id}`)
                        }}
                      >
                        핸들링 {ag.handling_count}
                      </button>
                    )}
                    {(ag.co_broker_count ?? 0) > 0 && (
                      <button
                        style={S.countLink}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/properties?coBrokerAgencyId=${ag.id}`)
                        }}
                      >
                        공동 중개 {ag.co_broker_count}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 12 }}>
                {ag.warning && <span style={S.warningBadge}>경고</span>}
                {ag.license_no && (
                  <span style={S.badge}>{ag.license_no}</span>
                )}
                <button
                  style={{ border: 'none', background: 'transparent', color: '#ff3b30', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  onClick={(event) => {
                    event.stopPropagation()
                    setDeleting(ag)
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </main>

      {showForm && (
        <AgencyForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="부동산을 삭제할까요?"
          description={`${deleting.name} 정보가 삭제됩니다.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteAgency(deleting.id)
            setDeleting(null)
            await load()
          }}
        />
      )}
      {bulkDeleting && (
        <ConfirmDialog
          title="선택 부동산을 삭제할까요?"
          description={`${selectedIds.size}개 부동산 정보가 삭제됩니다.`}
          confirmLabel="삭제"
          cancelLabel="취소"
          onCancel={() => setBulkDeleting(false)}
          onConfirm={handleBulkDelete}
        />
      )}
    </>
  )
}
