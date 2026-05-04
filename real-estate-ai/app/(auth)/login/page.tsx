// apple.md §13 — 로그인 페이지 (정적 UI, U1-3에서 Supabase Auth 연동 예정)

import LoginForm from '@/components/auth/LoginForm'

export const metadata = {
  title: '로그인 — 부동산 AI',
}

export default function LoginPage() {
  return <LoginForm />
}
