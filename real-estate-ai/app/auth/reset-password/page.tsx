'use client'

// 비밀번호 재설정 페이지 — Supabase 복구 토큰 교환 후 새 비밀번호 설정
// apple.md §13 인라인 스타일 적용

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

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
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1d1d1f',
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
  sub: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.48)',
    margin: '0 0 32px',
    textAlign: 'center' as const,
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
    marginBottom: 16,
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: -12,
    marginBottom: 12,
    display: 'block',
  },
  button: {
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
    fontFamily: 'inherit',
  },
  successBox: {
    background: 'rgba(52, 199, 89, 0.08)',
    border: '1px solid rgba(52, 199, 89, 0.3)',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 14,
    color: '#1d7a3a',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError('비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.')
        return
      }

      setIsDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={S.container}>
      <div style={S.card}>
        <p style={S.title}>새 비밀번호 설정</p>
        <p style={S.sub}>8자 이상의 새 비밀번호를 입력하세요</p>

        {isDone && (
          <div style={S.successBox}>
            ✅ 비밀번호가 변경됐습니다. 대시보드로 이동합니다…
          </div>
        )}

        {!isDone && (
          <form onSubmit={handleSubmit} noValidate>
            <label style={S.label}>새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={S.input}
              placeholder="8자 이상"
              disabled={isLoading}
              autoFocus
            />

            <label style={S.label}>비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={S.input}
              placeholder="동일한 비밀번호 재입력"
              disabled={isLoading}
            />

            {error && <span style={S.errorText}>{error}</span>}

            <button
              type="submit"
              style={{ ...S.button, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
              disabled={isLoading}
            >
              {isLoading ? '저장 중…' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
