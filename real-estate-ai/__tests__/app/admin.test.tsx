/**
 * U3-12: 관리자 설정 페이지 테스트
 *
 * - 구성원 목록 표시 (이름·이메일·역할)
 * - 초대 폼: 이메일 입력 → 초대 버튼
 * - 역할 변경 select
 * - 알림 토글 설정 표시 및 변경
 * - 비관리자에게 권한 없음 메시지
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter:   () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/admin',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/lib/supabase/admin', () => ({
  getCurrentUser: jest.fn(),
  listUsers:      jest.fn(),
  updateUserRole: jest.fn().mockResolvedValue(undefined),
  updateUserSettings: jest.fn().mockResolvedValue(undefined),
}))

const MOCK_ADMIN = {
  id: 'u-admin', name: '관리자', email: 'admin@test.com',
  role: 'admin', is_admin: true,
  settings: {
    notify_deadline_enabled: true,
    notify_schedule_enabled: false,
    auto_priority_enabled:   true,
    lease_countdown_days:    90,
  },
  created_at: '2026-01-01T00:00:00Z',
}

const MOCK_MEMBERS = [
  MOCK_ADMIN,
  {
    id: 'u-002', name: '김중개', email: 'kim@test.com',
    role: 'member', is_admin: false,
    settings: {},
    created_at: '2026-02-01T00:00:00Z',
  },
]

import AdminPage from '@/app/(app)/admin/page'

describe('U3-12 — 관리자 설정 페이지', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { getCurrentUser, listUsers } = require('@/lib/supabase/admin')
    getCurrentUser.mockResolvedValue(MOCK_ADMIN)
    listUsers.mockResolvedValue(MOCK_MEMBERS)
  })

  // ── 구성원 탭 ────────────────────────────────────────────

  it('구성원 목록이 이름·이메일과 함께 표시된다', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('관리자')).toBeInTheDocument())
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('김중개')).toBeInTheDocument()
    expect(screen.getByText('kim@test.com')).toBeInTheDocument()
  })

  it('"초대" 버튼 클릭 시 이메일 입력 폼이 나타난다', async () => {
    render(<AdminPage />)
    await waitFor(() => screen.getByText('관리자'))
    fireEvent.click(screen.getByRole('button', { name: /초대/ }))
    expect(screen.getByPlaceholderText(/초대할 이메일/)).toBeInTheDocument()
  })

  it('구성원 역할 select가 현재 역할을 보여준다', async () => {
    render(<AdminPage />)
    await waitFor(() => screen.getByText('김중개'))
    const selects = screen.getAllByRole('combobox')
    // 김중개의 역할 select는 'member' 값을 가짐
    const memberSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === 'member'
    )
    expect(memberSelect).toBeTruthy()
  })

  it('역할 변경 시 updateUserRole이 호출된다', async () => {
    const { updateUserRole } = require('@/lib/supabase/admin')
    render(<AdminPage />)
    await waitFor(() => screen.getByText('김중개'))
    const selects = screen.getAllByRole('combobox')
    const memberSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === 'member'
    )!
    fireEvent.change(memberSelect, { target: { value: 'assistant' } })
    await waitFor(() =>
      expect(updateUserRole).toHaveBeenCalledWith('u-002', 'assistant')
    )
  })

  // ── 알림 설정 탭 ─────────────────────────────────────────

  it('"알림 설정" 탭 클릭 시 토글 목록이 표시된다', async () => {
    render(<AdminPage />)
    await waitFor(() => screen.getByText('관리자'))
    fireEvent.click(screen.getByRole('button', { name: '알림 설정' }))
    expect(screen.getByText(/기한 알림/)).toBeInTheDocument()
    expect(screen.getByText(/일정 알림/)).toBeInTheDocument()
  })

  it('토글 변경 시 updateUserSettings가 호출된다', async () => {
    const { updateUserSettings } = require('@/lib/supabase/admin')
    render(<AdminPage />)
    await waitFor(() => screen.getByText('관리자'))
    fireEvent.click(screen.getByRole('button', { name: '알림 설정' }))

    // 현재 true인 "기한 알림" 토글을 클릭 → false로 변경
    const deadlineToggle = screen.getByRole('checkbox', { name: /기한 알림/ })
    fireEvent.click(deadlineToggle)
    await waitFor(() =>
      expect(updateUserSettings).toHaveBeenCalledWith(
        expect.objectContaining({ notify_deadline_enabled: false })
      )
    )
  })

  // ── 비관리자 접근 차단 ───────────────────────────────────

  it('비관리자(member)에게는 권한 없음 메시지가 표시된다', async () => {
    const { getCurrentUser } = require('@/lib/supabase/admin')
    getCurrentUser.mockResolvedValue({ ...MOCK_ADMIN, is_admin: false, role: 'member' })
    render(<AdminPage />)
    await waitFor(() =>
      expect(screen.getByText(/관리자 권한이 필요합니다/)).toBeInTheDocument()
    )
  })
})
