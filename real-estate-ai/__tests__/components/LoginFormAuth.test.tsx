/**
 * LoginForm — Supabase Auth 연동 동작 테스트 (U1-3)
 * @supabase/ssr 는 모킹하여 실제 네트워크 호출 없이 테스트
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Supabase 클라이언트 모킹
const mockSignInWithPassword = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

// next/navigation 모킹
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import LoginForm from '@/components/auth/LoginForm'

describe('LoginForm — Supabase Auth 연동 (apple.md §13)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('성공적인 로그인 후 /dashboard로 이동한다', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ data: { user: { id: '123' } }, error: null })

    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'admin@test.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'password123',
      })
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('로그인 실패 시 에러 메시지를 표시한다', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'wrong@test.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'wrongpass')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(screen.getByText(/이메일 또는 비밀번호가 올바르지 않습니다/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('로그인 중 버튼이 로딩 상태를 표시한다', async () => {
    // 한 번도 resolve되지 않는 promise로 로딩 상태 테스트
    mockSignInWithPassword.mockImplementationOnce(() => new Promise(() => {}))

    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'admin@test.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /로그인 중/i })).toBeInTheDocument()
    })
  })

  it('로그인 중 이메일·비밀번호 입력이 비활성화된다', async () => {
    mockSignInWithPassword.mockImplementationOnce(() => new Promise(() => {}))

    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'admin@test.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(screen.getByLabelText('이메일')).toBeDisabled()
      expect(screen.getByLabelText('비밀번호')).toBeDisabled()
    })
  })
})
