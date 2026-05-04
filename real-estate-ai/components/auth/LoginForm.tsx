'use client'

// apple.md §13 — 폼 컴포넌트: 인라인 스타일 사용 (Tailwind v4 + Turbopack 번들링 이슈 우회)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

interface FormValues {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
  auth?: string
}

function validate(values: FormValues): Omit<FormErrors, 'auth'> {
  const errors: Omit<FormErrors, 'auth'> = {}

  if (!values.email) {
    errors.email = '이메일을 입력해주세요'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = '올바른 이메일 형식이 아닙니다'
  }

  if (!values.password) {
    errors.password = '비밀번호를 입력해주세요'
  }

  return errors
}

// apple.md §13 스타일 상수
const S = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    padding: '24px',
  },
  card: {
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    padding: '44px 40px',
    width: '100%',
    maxWidth: 400,
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: '#0071e3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1d1d1f',
    margin: '0 0 4px',
    textAlign: 'center' as const,
  },
  logoSub: {
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.48)',
    margin: 0,
    textAlign: 'center' as const,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#1d1d1f',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    border: '1px solid rgba(0, 0, 0, 0.15)',
    padding: '0 12px',
    fontSize: 15,
    color: '#1d1d1f',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  inputFocus: {
    borderColor: '#0071e3',
    boxShadow: '0 0 0 3px rgba(0, 113, 227, 0.18)',
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
    display: 'block',
  },
  authErrorBox: {
    background: 'rgba(255, 59, 48, 0.06)',
    border: '1px solid rgba(255, 59, 48, 0.2)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    color: '#ff3b30',
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  submitButton: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    border: 'none',
    background: '#0071e3',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'opacity 150ms ease',
    fontFamily: 'inherit',
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}

export default function LoginForm() {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>({ email: '', password: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function handleChange(field: keyof FormValues, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)

    // 해당 필드 에러만 실시간 클리어
    if (errors[field] || errors.auth) {
      const nextErrors = { ...errors, auth: undefined }
      if (field === 'email') {
        const emailErrors = validate(next)
        if (!emailErrors.email) delete nextErrors.email
        else nextErrors.email = emailErrors.email
      } else {
        delete nextErrors[field]
      }
      setErrors(nextErrors)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        setErrors({ auth: '이메일 또는 비밀번호가 올바르지 않습니다' })
        return
      }

      router.push('/dashboard')
    } catch {
      setErrors({ auth: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' })
    } finally {
      setIsLoading(false)
    }
  }

  function inputStyle(field: keyof FormValues) {
    const isFocused = focusedField === field
    const hasError = !!errors[field]
    return {
      ...S.input,
      ...(hasError ? S.inputError : {}),
      ...(isFocused && !hasError ? S.inputFocus : {}),
      ...(isFocused && hasError ? { ...S.inputError, boxShadow: '0 0 0 3px rgba(255, 59, 48, 0.15)' } : {}),
    }
  }

  return (
    <div style={S.container}>
      <div style={S.card}>
        {/* 로고 */}
        <div style={S.logoArea}>
          <div style={S.logoIcon}>
            <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p style={S.logoTitle}>부동산 AI</p>
          <p style={S.logoSub}>공인중개사 AI 어시스턴트</p>
        </div>

        {/* 인증 에러 박스 */}
        {errors.auth && (
          <div role="alert" style={S.authErrorBox}>{errors.auth}</div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} noValidate>
          {/* 이메일 */}
          <div style={S.fieldGroup}>
            <label htmlFor="login-email" style={S.label}>이메일</label>
            <input
              id="login-email"
              aria-label="이메일"
              type="email"
              value={values.email}
              disabled={isLoading}
              onChange={e => handleChange('email', e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('email')}
              placeholder="example@email.com"
              autoComplete="email"
            />
            {errors.email && (
              <span role="alert" style={S.errorText}>{errors.email}</span>
            )}
          </div>

          {/* 비밀번호 */}
          <div style={S.fieldGroup}>
            <label htmlFor="login-password" style={S.label}>비밀번호</label>
            <input
              id="login-password"
              aria-label="비밀번호"
              type="password"
              value={values.password}
              disabled={isLoading}
              onChange={e => handleChange('password', e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('password')}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
            />
            {errors.password && (
              <span role="alert" style={S.errorText}>{errors.password}</span>
            )}
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...S.submitButton,
              ...(isLoading ? S.submitButtonDisabled : {}),
            }}
            onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.opacity = '0.88' }}
            onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            {isLoading ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
