'use client'

/**
 * U3-12 — 관리자 설정 페이지
 * 구성원 관리 탭 + 알림 설정 탭
 */

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import {
  getCurrentUser,
  listUsers,
  updateUserRole,
  updateUserSettings,
  type UserRole,
  type UserRow,
  type UserSettings,
} from '@/lib/supabase/admin'

// ─── 스타일 ────────────────────────────────────────────────
const S = {
  main: {
    flex: 1, overflowY: 'auto' as const, padding: '24px',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    background: '#f5f5f7', minHeight: '100vh',
  },
  inner: { maxWidth: 720, margin: '0 auto' },
  tabs: { display: 'flex' as const, gap: 8, marginBottom: 24 },
  tabBtn: (active: boolean) => ({
    background: active ? '#0071e3' : 'rgba(0,0,0,0.06)',
    color: active ? '#fff' : '#1d1d1f',
    border: 'none', borderRadius: 8,
    padding: '8px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer' as const,
    fontFamily: 'inherit',
  }),
  card: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '24px 28px', marginBottom: 16,
  },
  toolbar: { display: 'flex' as const, justifyContent: 'flex-end' as const, marginBottom: 16 },
  btnPrimary: {
    background: '#0071e3', color: '#fff', border: 'none',
    borderRadius: 8, padding: '8px 16px', fontSize: 13,
    fontWeight: 600, cursor: 'pointer' as const, fontFamily: 'inherit',
  },
  btnGhost: {
    background: 'transparent', color: '#636366', border: 'none',
    borderRadius: 6, padding: '6px 12px', fontSize: 13,
    cursor: 'pointer' as const, fontFamily: 'inherit',
  },
  memberRow: {
    display: 'flex' as const, alignItems: 'center' as const,
    gap: 12, padding: '12px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  memberRowLast: {
    display: 'flex' as const, alignItems: 'center' as const,
    gap: 12, padding: '12px 0',
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%' as const,
    background: '#e5e5ea', display: 'flex' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    fontSize: 14, fontWeight: 700, color: '#636366',
    flexShrink: 0,
  },
  memberName: { fontSize: 14, fontWeight: 600, color: '#1d1d1f' },
  memberEmail: { fontSize: 12, color: 'rgba(0,0,0,0.45)' },
  roleSelect: {
    marginLeft: 'auto' as const,
    border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6,
    padding: '5px 8px', fontSize: 13, color: '#1d1d1f',
    background: '#fff', cursor: 'pointer' as const, fontFamily: 'inherit',
  },
  inviteInput: {
    width: '100%', boxSizing: 'border-box' as const,
    border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, color: '#1d1d1f',
    fontFamily: 'inherit', outline: 'none', marginBottom: 12,
  },
  notifyRow: {
    display: 'flex' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '13px 0', borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  notifyRowLast: {
    display: 'flex' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '13px 0',
  },
  notifyLabel: { fontSize: 14, color: '#1d1d1f' },
  notifyDesc: { fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  sectionTitle: {
    fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.45)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 16,
  },
  deniedBox: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '80px 24px', textAlign: 'center' as const,
    color: '#ff3b30', fontSize: 15, fontWeight: 500,
  },
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin:     'Admin',
  member:    '구성원',
  assistant: '보조',
}

// ─── 알림 설정 항목 ───────────────────────────────────────
const NOTIFY_ITEMS: Array<{
  key: keyof UserSettings
  label: string
  desc?: string
}> = [
  { key: 'notify_deadline_enabled',           label: '기한 알림',     desc: '계약·일정 기한이 임박하면 알림' },
  { key: 'notify_schedule_enabled',           label: '일정 알림',     desc: '등록된 일정 전날 알림' },
  { key: 'notify_regulation_change_enabled',  label: '규제 변경 알림',  desc: '규제지역 변경 시 알림' },
  { key: 'notify_diagnosis_change_enabled',   label: '진단 변경 알림',  desc: '매물 진단 결과 변경 시 알림' },
  { key: 'notify_maintenance_recovery_enabled', label: '시설 복구 알림', desc: '시설 이슈 해결 시 알림' },
  { key: 'notify_commission_unpaid_enabled',  label: '수수료 미수령 알림', desc: '미수령 수수료 발생 시 알림' },
  { key: 'auto_priority_enabled',             label: '자동 우선순위',  desc: '기한 임박 시 자동 집중관리 지정' },
]

// ─── 구성원 탭 ─────────────────────────────────────────────
function MembersTab({ me, members, onRoleChange, onInvited }: {
  me: UserRow
  members: UserRow[]
  onRoleChange: (userId: string, role: UserRole) => void
  onInvited: () => void
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting,   setInviting]   = useState(false)
  const [inviteMsg,  setInviteMsg]  = useState('')

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      if (!res.ok) throw new Error('초대 실패')
      setInviteMsg('초대 이메일을 발송했습니다.')
      setInviteEmail('')
      setShowInvite(false)
      onInvited()          // ← 목록 즉시 갱신
    } catch {
      setInviteMsg('초대에 실패했습니다.')
    } finally {
      setInviting(false)
    }
  }, [inviteEmail, onInvited])

  return (
    <div>
      <div style={S.toolbar}>
        <button style={S.btnPrimary} onClick={() => setShowInvite((v) => !v)}>
          초대
        </button>
      </div>

      {showInvite && (
        <div style={S.card}>
          <p style={S.sectionTitle}>구성원 초대</p>
          <input
            style={S.inviteInput}
            placeholder="초대할 이메일을 입력하세요"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            type="email"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button style={S.btnGhost} onClick={() => setShowInvite(false)}>취소</button>
            <button
              style={{ ...S.btnPrimary, opacity: inviting ? 0.7 : 1 }}
              onClick={handleInvite}
              disabled={inviting}
            >
              {inviting ? '발송 중…' : '초대 발송'}
            </button>
          </div>
          {inviteMsg && (
            <p style={{ fontSize: 13, color: '#34c759', marginTop: 10 }}>{inviteMsg}</p>
          )}
        </div>
      )}

      <div style={S.card}>
        <p style={S.sectionTitle}>구성원 목록</p>
        {members.map((u, idx) => {
          const isLast = idx === members.length - 1
          const initial = u.name.charAt(0)
          const isSelf = u.id === me.id
          return (
            <div key={u.id} style={isLast ? S.memberRowLast : S.memberRow}>
              <div style={S.avatar}>{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={S.memberName}>{u.name}</p>
                <p style={S.memberEmail}>{u.email}</p>
              </div>
              <select
                style={S.roleSelect}
                value={u.role}
                disabled={isSelf}
                onChange={(e) => onRoleChange(u.id, e.target.value as UserRole)}
                aria-label={`${u.name} 역할`}
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 알림 설정 탭 ─────────────────────────────────────────
function NotifyTab({ settings, onChange }: {
  settings: UserSettings
  onChange: (key: keyof UserSettings, value: boolean) => void
}) {
  return (
    <div style={S.card}>
      <p style={S.sectionTitle}>알림 설정</p>
      {NOTIFY_ITEMS.map((item, idx) => {
        const isLast = idx === NOTIFY_ITEMS.length - 1
        const checked = !!(settings[item.key])
        return (
          <div key={item.key} style={isLast ? S.notifyRowLast : S.notifyRow}>
            <div>
              <p style={S.notifyLabel}>{item.label}</p>
              {item.desc && <p style={S.notifyDesc}>{item.desc}</p>}
            </div>
            <input
              type="checkbox"
              aria-label={item.label}
              checked={checked}
              onChange={() => onChange(item.key, !checked)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0071e3' }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── 페이지 ──────────────────────────────────────────────
type Tab = 'members' | 'notify'

export default function AdminPage() {
  const [me,       setMe]       = useState<UserRow | null>(null)
  const [members,  setMembers]  = useState<UserRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<Tab>('members')
  const [settings, setSettings] = useState<UserSettings>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [currentUser, allUsers] = await Promise.all([getCurrentUser(), listUsers()])
      setMe(currentUser)
      setMembers(allUsers)
      if (currentUser?.settings) setSettings(currentUser.settings)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRoleChange = useCallback(async (userId: string, role: UserRole) => {
    try {
      await updateUserRole(userId, role)
      setMembers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role, is_admin: role === 'admin' } : u
        )
      )
    } catch {
      // 역할 변경 실패 시 리로드
      load()
    }
  }, [load])

  const handleNotifyChange = useCallback(async (key: keyof UserSettings, value: boolean) => {
    const patch = { [key]: value }
    setSettings((prev) => ({ ...prev, ...patch }))
    try {
      await updateUserSettings(patch)
    } catch {
      // 롤백
      setSettings((prev) => ({ ...prev, [key]: !value }))
    }
  }, [])

  if (loading) {
    return (
      <>
        <Header title="관리자 설정" />
        <main style={S.main}>
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(0,0,0,0.35)', fontSize: 14 }}>
            로딩 중…
          </div>
        </main>
      </>
    )
  }

  // 비관리자 접근 차단
  if (!me || !me.is_admin) {
    return (
      <>
        <Header title="관리자 설정" />
        <main style={S.main}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={S.deniedBox}>
              관리자 권한이 필요합니다
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="관리자 설정" />
      <main style={S.main}>
        <div style={S.inner}>
          {/* 탭 바 */}
          <div style={S.tabs}>
            <button style={S.tabBtn(tab === 'members')} onClick={() => setTab('members')}>
              구성원 관리
            </button>
            <button style={S.tabBtn(tab === 'notify')} onClick={() => setTab('notify')}>
              알림 설정
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          {tab === 'members' ? (
            <MembersTab
              me={me}
              members={members}
              onRoleChange={handleRoleChange}
              onInvited={load}
            />
          ) : (
            <NotifyTab
              settings={settings}
              onChange={handleNotifyChange}
            />
          )}
        </div>
      </main>
    </>
  )
}
