'use client'

// apple.md §14 — 부동산 상세 페이지
// U3-10

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { getAgency, updateAgency, getAgencyMemos, addAgencyMemo, deleteAgencyMemo, type AgencyRow, type AgencyMemoRow } from '@/lib/supabase/agencies'
import { listProperties, type PropertyRow } from '@/lib/supabase/properties'
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

const TRUST_LEVELS = ['신뢰', '일반', '주의'] as const

function EditForm({ agency, onCancel, onSaved }: EditFormProps) {
  const [name,        setName]        = useState(agency.name)
  const [rep,         setRep]         = useState(agency.representative ?? '')
  const [phone,       setPhone]       = useState(agency.phone          ?? '')
  const [address,     setAddress]     = useState(agency.address        ?? '')
  const [licenseNo,   setLicenseNo]   = useState(agency.license_no     ?? '')
  const [notes,       setNotes]       = useState(agency.notes          ?? '')
  const [alias,       setAlias]       = useState(agency.alias          ?? '')
  const [isOurOffice, setIsOurOffice] = useState(agency.is_our_office  ?? false)
  const [trustLevel,  setTrustLevel]  = useState<string>(agency.trust_level ?? '일반')
  const [tags,        setTags]        = useState<string[]>(agency.tags ?? [])
  const [tagInput,    setTagInput]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  function addTag() {
    const trimmed = tagInput.trim()
    if (!trimmed || tags.includes(trimmed)) return
    setTags([...tags, trimmed])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError('상호명을 입력하세요.'); return }
    setSaving(true)
    try {
      await updateAgency(agency.id, {
        name:           name.trim(),
        representative: rep.trim()       || undefined,
        phone:          phone.trim()     || undefined,
        address:        address.trim()   || undefined,
        license_no:     licenseNo.trim() || undefined,
        notes:          notes.trim()     || undefined,
        alias:          alias.trim()     || undefined,
        is_our_office:  isOurOffice,
        trust_level:    trustLevel,
        tags,
      })
      onSaved({
        ...agency,
        name,
        representative: rep       || null,
        phone:          phone     || null,
        address:        address   || null,
        license_no:     licenseNo || null,
        notes:          notes     || null,
        alias:          alias     || null,
        is_our_office:  isOurOffice,
        trust_level:    trustLevel,
        tags,
      })
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [name, rep, phone, address, licenseNo, notes, alias, isOurOffice, trustLevel, tags, agency, onSaved])

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

      {/* 별칭 */}
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="edit-alias" style={S.label}>별칭</label>
        <input
          id="edit-alias"
          style={S.input}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="선택사항"
        />
      </div>

      {/* 우리사무소 */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <label htmlFor="edit-our-office" style={{ ...S.label, marginBottom: 0 }}>우리사무소</label>
        <input
          id="edit-our-office"
          type="checkbox"
          checked={isOurOffice}
          onChange={(e) => setIsOurOffice(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
      </div>

      {/* 신뢰 상태 */}
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="edit-trust" style={S.label}>신뢰 상태</label>
        <select
          id="edit-trust"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8,
            padding: '8px 12px', fontSize: 14, color: '#1d1d1f',
            fontFamily: 'inherit', background: '#fff',
          }}
          value={trustLevel}
          onChange={(e) => setTrustLevel(e.target.value)}
        >
          {TRUST_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>
      </div>

      {/* 태그 */}
      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>태그</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(0,0,0,0.07)', borderRadius: 6,
                padding: '3px 8px', fontSize: 12, color: '#3a3a3c',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, fontSize: 12, color: 'rgba(0,0,0,0.45)', lineHeight: 1,
                }}
              >×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            style={{ ...S.input, flex: 1 }}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="태그 입력 후 추가"
          />
          <button
            type="button"
            onClick={addTag}
            style={{
              background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8,
              padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              color: '#1d1d1f',
            }}
          >추가</button>
        </div>
      </div>

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

function propertySummary(property: PropertyRow): string {
  return [
    property.handling_name,
    property.neighborhood || property.road_address,
    property.alias,
    property.deal_type,
    property.price_text,
    property.area_text,
  ].filter(Boolean).join(' · ')
}

function PropertyListCard({
  title,
  empty,
  properties,
  testId,
  onOpen,
}: {
  title: string
  empty: string
  properties: PropertyRow[]
  testId: string
  onOpen: () => void
}) {
  return (
    <div style={{ ...S.card, maxWidth: 640, margin: '0 auto' }} data-testid={testId}>
      <p style={S.sectionTitle}>{title}</p>
      {properties.length === 0 ? (
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)' }}>{empty}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {properties.map((property) => {
            const label = property.alias || property.road_address
            return (
              <button
                key={property.id}
                type="button"
                style={{
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: '#fff',
                  borderRadius: 8,
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onClick={onOpen}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.48)', marginTop: 3 }}>
                  {propertySummary(property)}
                </div>
              </button>
            )
          })}
        </div>
      )}
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
  const [handlingProperties, setHandlingProperties] = useState<PropertyRow[]>([])
  const [coBrokerProperties, setCoBrokerProperties] = useState<PropertyRow[]>([])

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

  const loadPropertyLists = useCallback(async () => {
    try {
      const [handling, coBroker] = await Promise.all([
        listProperties({ handlingAgencyId: id }),
        listProperties({ coBrokerAgencyId: id }),
      ])
      setHandlingProperties(handling)
      setCoBrokerProperties(coBroker)
    } catch {
      setHandlingProperties([])
      setCoBrokerProperties([])
    }
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
  useEffect(() => { loadPropertyLists() }, [loadPropertyLists])

  if (loading) {
    return (
      <>
        <Header title="부동산 상세" />
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
        <Header title="부동산 상세" />
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
              <DetailField label="비고"     value={agency.notes} />

              {/* 별칭 */}
              <div style={S.row}>
                <span style={S.label}>별칭</span>
                {agency.alias
                  ? <span style={S.value}>{agency.alias}</span>
                  : <span style={S.emptyValue}>—</span>
                }
              </div>

              {/* 우리사무소 */}
              <div style={S.row}>
                <span style={S.label}>우리사무소</span>
                <span style={S.value}>
                  {agency.is_our_office ? (
                    <span style={{
                      display: 'inline-block',
                      background: '#0071e3', color: '#fff',
                      fontSize: 11, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 6,
                    }}>예</span>
                  ) : (
                    <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: 14 }}>아니오</span>
                  )}
                </span>
              </div>

              {/* 신뢰 상태 */}
              <div style={S.row}>
                <span style={S.label}>신뢰 상태</span>
                <span style={S.value}>
                  {(() => {
                    const lvl = agency.trust_level ?? '일반'
                    const cfg: Record<string, { bg: string; color: string }> = {
                      '신뢰': { bg: 'rgba(52,199,89,0.12)',  color: '#34c759' },
                      '일반': { bg: 'rgba(99,99,102,0.10)',  color: '#636366' },
                      '주의': { bg: 'rgba(255,59,48,0.10)',  color: '#ff3b30' },
                    }
                    const style = cfg[lvl] ?? cfg['일반']
                    return (
                      <span style={{
                        display: 'inline-block',
                        background: style.bg, color: style.color,
                        fontSize: 11, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 6,
                      }}>{lvl}</span>
                    )
                  })()}
                </span>
              </div>

              {/* 태그 */}
              <div style={S.rowLast}>
                <span style={S.label}>태그</span>
                <span style={{ ...S.value, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(agency.tags ?? []).length > 0
                    ? agency.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            background: 'rgba(0,0,0,0.07)', borderRadius: 6,
                            padding: '2px 8px', fontSize: 12, color: '#3a3a3c',
                          }}
                        >{tag}</span>
                      ))
                    : <span style={S.emptyValue}>—</span>
                  }
                </span>
              </div>
            </>
          )}
        </div>

        <PropertyListCard
          title="핸들링 매물"
          empty="핸들링 중인 매물이 없습니다."
          properties={handlingProperties}
          testId="handling-properties-section"
          onOpen={() => router.push(`/properties?handlingAgencyId=${agency.id}`)}
        />

        <PropertyListCard
          title="공동 중개 매물"
          empty="공동 중개 매물이 없습니다."
          properties={coBrokerProperties}
          testId="co-broker-properties-section"
          onOpen={() => router.push(`/properties?coBrokerAgencyId=${agency.id}`)}
        />

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
