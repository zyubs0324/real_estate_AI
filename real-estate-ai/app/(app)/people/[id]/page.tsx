'use client'

// apple.md §14 — 인물 프로필 페이지
// U3-6: 기본정보 · 역할이력 타임라인 · 메모 · 관심매물

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import {
  getPerson, getPersonRelations, getPersonMemos, addPersonMemo, deletePersonMemo,
  getPersonOwnedPropertyGroups,
  type PersonRow, type RelationRow, type MemoRow, type OwnedPropertyGroup,
} from '@/lib/supabase/people'
import MemoSection, { type MemoSavePayload } from '@/components/common/MemoSection'

// ─── 스타일 ────────────────────────────────────────────────
const S = {
  main: {
    flex: 1, overflowY: 'auto' as const, padding: '24px',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  },
  backBtn: {
    display: 'inline-flex' as const, alignItems: 'center' as const,
    gap: 4, marginBottom: 20, padding: '6px 12px',
    borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
    background: '#ffffff', fontSize: 13, fontWeight: 500,
    color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit',
  },
  grid: { display: 'grid' as const, gridTemplateColumns: '320px 1fr', gap: 20 },
  card: {
    background: '#ffffff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 24px',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.4)', marginBottom: 14, letterSpacing: '0.04em' },
  nameRow: { display: 'flex' as const, alignItems: 'center' as const, gap: 10, marginBottom: 16 },
  name: { fontSize: 22, fontWeight: 700, color: '#1d1d1f' },
  warningBadge: {
    fontSize: 11, fontWeight: 700, padding: '3px 8px',
    borderRadius: 6, background: '#ff3b30', color: '#ffffff',
  },
  infoRow: {
    display: 'flex' as const, justifyContent: 'space-between' as const,
    padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
    fontSize: 13,
  },
  infoLabel: { color: 'rgba(0,0,0,0.4)', fontWeight: 500 },
  infoValue: { color: '#1d1d1f', fontWeight: 600 },
  // 타임라인
  timeline: { listStyle: 'none', padding: 0, margin: 0 },
  timelineItem: {
    display: 'flex' as const, gap: 12, paddingBottom: 16,
    position: 'relative' as const,
  },
  dot: (active: boolean): React.CSSProperties => ({
    width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
    background: active ? '#0071e3' : '#d1d1d6',
  }),
  timelineBody: { flex: 1 },
  timelineRole: { fontSize: 13, fontWeight: 600, color: '#1d1d1f' },
  timelineAddr: { fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 2 },
  timelineDate: { fontSize: 11, color: 'rgba(0,0,0,0.3)', marginTop: 2 },
  timelineEmpty: { fontSize: 13, color: 'rgba(0,0,0,0.35)', padding: '12px 0' },
  // 메모
  memoList: { listStyle: 'none', padding: 0, margin: '0 0 16px' },
  memoItem: (type: string): React.CSSProperties => ({
    padding: '10px 12px', borderRadius: 8, marginBottom: 8,
    background: type === 'warning' || type === 'dispute'
      ? 'rgba(255,59,48,0.06)' : '#f5f5f7',
    borderLeft: `3px solid ${
      type === 'warning' ? '#ff9f0a' :
      type === 'dispute' ? '#ff3b30' : '#d1d1d6'
    }`,
  }),
  memoContent: { fontSize: 13, color: '#1d1d1f', lineHeight: 1.5 },
  memoDate:    { fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 4 },
  memoForm: { display: 'flex' as const, flexDirection: 'column' as const, gap: 8, marginTop: 4 },
  memoTextarea: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)', fontSize: 13,
    color: '#1d1d1f', background: '#f5f5f7', resize: 'vertical' as const,
    fontFamily: 'inherit', minHeight: 72, boxSizing: 'border-box' as const,
  },
  memoTypeRow: { display: 'flex' as const, gap: 6 },
  memoTypeBtn: (active: boolean, color: string): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 6, border: 'none',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? color : '#f5f5f7',
    color: active ? '#ffffff' : 'rgba(0,0,0,0.5)',
  }),
  saveMemoBtn: {
    alignSelf: 'flex-end' as const, padding: '7px 18px', borderRadius: 8,
    border: 'none', background: '#0071e3', color: '#ffffff',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  // 관심매물 섹션
  interestEmpty: { fontSize: 13, color: 'rgba(0,0,0,0.35)', padding: '12px 0' },
  ownedUnit: { padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' },
  ownedHeader: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  ownedTitle: { fontSize: 13, fontWeight: 700, color: '#1d1d1f' },
  ownedMeta: { fontSize: 11, color: 'rgba(0,0,0,0.4)' },
  listingRow: {
    display: 'flex' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
    fontSize: 12,
    color: 'rgba(0,0,0,0.58)',
    padding: '3px 0',
  },
}

// ─── 헬퍼 ────────────────────────────────────────────────
function shortAddr(addr: string): string {
  const parts = addr.trim().split(/\s+/)
  return parts.length > 2 ? parts.slice(-2).join(' ') : addr
}

function formatDate(iso: string | null): string {
  if (!iso) return '현재'
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' })
}

// ─── 페이지 ──────────────────────────────────────────────
export default function PersonProfilePage() {
  const router   = useRouter()
  const { id }   = useParams<{ id: string }>()

  const [person,    setPerson]    = useState<PersonRow | null>(null)
  const [relations, setRelations] = useState<RelationRow[]>([])
  const [ownedGroups, setOwnedGroups] = useState<OwnedPropertyGroup[]>([])
  const [memos,     setMemos]     = useState<MemoRow[]>([])
  const [loading,   setLoading]   = useState(true)


  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, rels, owned, mms] = await Promise.all([
        getPerson(id),
        getPersonRelations(id),
        getPersonOwnedPropertyGroups(id),
        getPersonMemos(id),
      ])
      setPerson(p)
      setRelations(rels)
      setOwnedGroups(owned)
      setMemos(mms)
    } catch {
      // 로드 실패 시 빈 상태 유지
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSaveMemo(payload: MemoSavePayload) {
    await addPersonMemo(id, payload)
    await load()
  }

  async function handleDeleteMemo(memoId: string) {
    await deletePersonMemo(memoId)
    await load()
  }

  if (loading) {
    return (
      <>
        <Header title="인물 프로필" />
        <main style={S.main}>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>불러오는 중…</div>
        </main>
      </>
    )
  }

  if (!person) {
    return (
      <>
        <Header title="인물 프로필" />
        <main style={S.main}>
          <div style={{ fontSize: 13, color: '#ff3b30' }}>인물 정보를 찾을 수 없습니다.</div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="인물 프로필" />
      <main style={S.main}>

        {/* 뒤로가기 */}
        <button style={S.backBtn} onClick={() => router.back()}>
          ← 목록으로
        </button>

        <div style={S.grid}>

          {/* ── 왼쪽: 기본 정보 ── */}
          <div>
            <div style={S.card}>
              <div style={S.nameRow}>
                <span style={S.name}>{person.name}</span>
                {person.warning && (
                  <span style={S.warningBadge} data-testid="warning-badge">경고</span>
                )}
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>연락처</span>
                <span style={S.infoValue}>{person.phone || '—'}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>역할</span>
                <span style={S.infoValue}>{person.role || '-'}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>통신사</span>
                <span style={S.infoValue}>{person.carrier || person.carrier_note || '-'}</span>
              </div>
              {person.display_name && (
                <div style={S.infoRow}>
                  <span style={S.infoLabel}>별칭/호칭</span>
                  <span style={S.infoValue}>{person.display_name}</span>
                </div>
              )}
              {person.address && (
                <div style={S.infoRow}>
                  <span style={S.infoLabel}>주소</span>
                  <span style={S.infoValue}>{person.address}</span>
                </div>
              )}
              <div style={S.infoRow}>
                <span style={S.infoLabel}>법인</span>
                {person.is_corporate
                  ? <span style={{ ...S.infoValue, color: '#0071e3', background: 'rgba(0,113,227,0.10)', borderRadius: 6, padding: '1px 8px', fontSize: 12 }}>예</span>
                  : <span style={S.infoValue}>아니오</span>
                }
              </div>
              {person.notes && (
                <div style={S.infoRow}>
                  <span style={S.infoLabel}>메모</span>
                  <span style={{ ...S.infoValue, whiteSpace: 'pre-wrap' as const }}>{person.notes}</span>
                </div>
              )}
              <div style={{ ...S.infoRow, borderBottom: 'none' }}>
                <span style={S.infoLabel}>등록일</span>
                <span style={S.infoValue}>{new Date(person.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            {/* 관심 매물 */}
            <div style={S.card} data-testid="interest-section">
              <div style={S.cardTitle}>관심 매물</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                <button
                  style={{ border: '1px solid #0071e3', color: '#0071e3', borderRadius: 8, padding: '7px 14px', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                  onClick={() => router.push(`/properties?ownerPersonId=${person.id}`)}
                >
                  소유 매물 보기
                </button>
                <button
                  style={{ border: '1px solid #0071e3', color: '#0071e3', borderRadius: 8, padding: '7px 14px', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                  onClick={() => router.push(`/properties?handlingPersonId=${person.id}`)}
                >
                  핸들링 매물 보기
                </button>
              </div>
            </div>

            <div style={S.card} data-testid="owned-properties-section">
              <div style={S.cardTitle}>소유 매물</div>
              {ownedGroups.length === 0 ? (
                <div style={S.interestEmpty}>연결된 소유 매물이 없습니다.</div>
              ) : (
                <div>
                  {ownedGroups.map((group) => (
                    <div key={group.unit_key} style={S.ownedUnit}>
                      <div style={S.ownedHeader}>
                        <button
                          style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                          onClick={() => router.push(`/properties?ownerPersonId=${person.id}`)}
                        >
                          <div style={S.ownedTitle}>
                            {[group.road_address, group.building_dong, group.unit_number].filter(Boolean).join(' ')}
                          </div>
                        </button>
                        <span style={S.ownedMeta}>
                          {group.share_ratio ?? '-'} · 등록 {group.listings.length}건
                        </span>
                      </div>
                      {group.listings.map((listing) => (
                        <div key={listing.id} style={S.listingRow}>
                          <span>{listing.handling_name || '-'}</span>
                          <span>{listing.alias || listing.neighborhood || '-'}</span>
                          <span>{listing.deal_type || '-'}</span>
                          <span>{listing.price_text || '-'}</span>
                          <span>{listing.area_text || '-'}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 오른쪽: 역할 이력 + 메모 ── */}
          <div>

            {/* 역할 이력 타임라인 */}
            <div style={S.card}>
              <div style={S.cardTitle}>역할 이력</div>
              {relations.length === 0 ? (
                <div style={S.timelineEmpty}>등록된 역할 이력이 없습니다.</div>
              ) : (
                <ul style={S.timeline} data-testid="relation-timeline">
                  {relations.map((r) => {
                    const isActive = !r.ended_at
                    return (
                      <li key={r.id} style={S.timelineItem}>
                        <div style={S.dot(isActive)} />
                        <div style={S.timelineBody}>
                          <div style={S.timelineRole}>{r.role}</div>
                          <button
                            style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: r.property ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (r.property) router.push(`/properties?ownerPersonId=${person.id}`)
                            }}
                          >
                            <div style={S.timelineAddr}>
                              {r.property
                                ? [
                                  r.property.handling_name,
                                  r.property.neighborhood || shortAddr(r.property.road_address),
                                  r.property.alias,
                                  r.property.deal_type,
                                  r.property.price_text,
                                  r.property.area_text,
                                ].filter(Boolean).join(' · ')
                                : '-'}
                            </div>
                          </button>
                          <div style={S.timelineDate}>
                            {formatDate(r.started_at)} ~ {formatDate(r.ended_at)}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* 메모 */}
            <div style={S.card}>
              <div style={S.cardTitle}>메모</div>
              <MemoSection
                memos={memos}
                onSave={handleSaveMemo}
                onDelete={handleDeleteMemo}
              />
            </div>

          </div>
        </div>
      </main>
    </>
  )
}
