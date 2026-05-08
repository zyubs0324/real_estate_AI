/**
 * LoginForm — UI 구조 테스트 (apple.md §13)
 * Supabase + useRouter 는 모킹하여 순수 UI 동작만 검증
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Supabase 클라이언트 모킹 (UI 테스트이므로 항상 성공 반환)
const mockSignInWithPassword = jest.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null })
jest.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}))

// useRouter 모킹
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import LoginForm from '@/components/auth/LoginForm'

describe('LoginForm — UI 구조 (apple.md §13)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('로고/브랜드 영역을 렌더링한다', () => {
    render(<LoginForm />)
    expect(screen.getByText('부동산 AI')).toBeInTheDocument()
  })

  it('이메일·비밀번호 입력 필드를 렌더링한다', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  })

  it('로그인 버튼을 렌더링한다', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('빈 채로 제출하면 이메일 유효성 에러를 표시한다', async () => {
    render(<LoginForm />)
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => {
      expect(screen.getByText(/이메일을 입력해주세요/i)).toBeInTheDocument()
    })
  })

  it('빈 채로 제출하면 비밀번호 유효성 에러를 표시한다', async () => {
    render(<LoginForm />)
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => {
      expect(screen.getByText(/비밀번호를 입력해주세요/i)).toBeInTheDocument()
    })
  })

  it('잘못된 이메일 형식에 대한 에러를 표시한다', async () => {
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'notanemail')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => {
      expect(screen.getByText(/올바른 이메일 형식이 아닙니다/i)).toBeInTheDocument()
    })
  })

  it('유효한 이메일 입력 시 이메일 에러가 사라진다', async () => {
    render(<LoginForm />)
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => {
      expect(screen.getByText(/이메일을 입력해주세요/i)).toBeInTheDocument()
    })
    await userEvent.type(screen.getByLabelText('이메일'), 'valid@example.com')
    await waitFor(() => {
      expect(screen.queryByText(/이메일을 입력해주세요/i)).not.toBeInTheDocument()
    })
  })

  it('제출 버튼 배경이 Apple Blue(#0071e3)이다', () => {
    render(<LoginForm />)
    const btn = screen.getByRole('button', { name: '로그인' })
    expect(btn.style.background).toMatch(/rgb\(0,\s*113,\s*227\)|#0071e3/i)
  })

  it('이메일 입력 type이 email이다', () => {
    render(<LoginForm />)
    expect((screen.getByLabelText('이메일') as HTMLInputElement).type).toBe('email')
  })

  it('비밀번호 입력 type이 password이다', () => {
    render(<LoginForm />)
    expect((screen.getByLabelText('비밀번호') as HTMLInputElement).type).toBe('password')
  })
})
