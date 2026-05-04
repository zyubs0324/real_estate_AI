import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/components/auth/LoginForm'

describe('LoginForm — apple.md §13', () => {
  it('renders the logo/brand section', () => {
    render(<LoginForm />)
    expect(screen.getByText('부동산 AI')).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  })

  it('renders the login submit button', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('shows email validation error when submitted empty', async () => {
    render(<LoginForm />)
    const submitButton = screen.getByRole('button', { name: '로그인' })
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(screen.getByText(/이메일을 입력해주세요/i)).toBeInTheDocument()
    })
  })

  it('shows password validation error when submitted empty', async () => {
    render(<LoginForm />)
    const submitButton = screen.getByRole('button', { name: '로그인' })
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(screen.getByText(/비밀번호를 입력해주세요/i)).toBeInTheDocument()
    })
  })

  it('shows invalid email format error', async () => {
    render(<LoginForm />)
    const emailInput = screen.getByLabelText('이메일')
    await userEvent.type(emailInput, 'notanemail')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => {
      expect(screen.getByText(/올바른 이메일 형식이 아닙니다/i)).toBeInTheDocument()
    })
  })

  it('clears email error when user types a valid email', async () => {
    render(<LoginForm />)
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => {
      expect(screen.getByText(/이메일을 입력해주세요/i)).toBeInTheDocument()
    })
    const emailInput = screen.getByLabelText('이메일')
    await userEvent.type(emailInput, 'valid@example.com')
    await waitFor(() => {
      expect(screen.queryByText(/이메일을 입력해주세요/i)).not.toBeInTheDocument()
    })
  })

  it('applies Apple Blue (#0071e3) to submit button background', () => {
    render(<LoginForm />)
    const btn = screen.getByRole('button', { name: '로그인' })
    expect(btn.style.background).toMatch(/rgb\(0,\s*113,\s*227\)|#0071e3/i)
  })

  it('email input type is email', () => {
    render(<LoginForm />)
    const emailInput = screen.getByLabelText('이메일') as HTMLInputElement
    expect(emailInput.type).toBe('email')
  })

  it('password input type is password', () => {
    render(<LoginForm />)
    const passwordInput = screen.getByLabelText('비밀번호') as HTMLInputElement
    expect(passwordInput.type).toBe('password')
  })

  it('logs to console on valid form submission (static demo behaviour)', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText('이메일'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('로그인 시도'),
        expect.objectContaining({ email: 'test@example.com' }),
      )
    })
    consoleSpy.mockRestore()
  })
})
