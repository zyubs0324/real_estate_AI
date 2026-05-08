/**
 * U1-5 → U3-9: 대시보드 레이아웃 + 카드 제목 존재 확인
 * (데이터 연결 후 'use client' 전환 — Supabase 함수 모킹 추가)
 */
import { render, screen, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter:   () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/components/dashboard/QuickAddressSearch', () => {
  const MockQuick = () => <div><p>빠른 주소 검색</p></div>
  MockQuick.displayName = 'QuickAddressSearch'
  return MockQuick
})

jest.mock('@/lib/supabase/schedules', () => ({
  listSchedules: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/supabase/properties', () => ({
  listProperties: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/supabase/transactions', () => ({
  listTransactions: jest.fn().mockResolvedValue([]),
}))

import DashboardPage from '@/app/(app)/dashboard/page'

describe('Dashboard — 6개 블록 레이아웃 (U1-5 → U3-9)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('페이지 제목 "대시보드"를 렌더링한다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('대시보드')).toBeInTheDocument())
  })

  it('오늘의 알림 블록을 렌더링한다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('오늘의 알림')).toBeInTheDocument())
  })

  it('빠른 주소 검색 블록을 렌더링한다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('빠른 주소 검색')).toBeInTheDocument())
  })

  it('최근 매물 블록을 렌더링한다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('최근 매물')).toBeInTheDocument())
  })

  it('계약 만료 임박 블록을 렌더링한다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('계약 만료 임박')).toBeInTheDocument())
  })

  it('담당 거래 현황 블록을 렌더링한다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('담당 거래 현황')).toBeInTheDocument())
  })

  it('수수료 미수령 블록을 렌더링한다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('수수료 미수령')).toBeInTheDocument())
  })

  it('데이터 없을 때 각 블록이 빈 상태 메시지를 표시한다', async () => {
    render(<DashboardPage />)
    await waitFor(() =>
      expect(screen.getAllByText(/없습니다|없음/).length).toBeGreaterThanOrEqual(4)
    )
  })

  it('main 요소 안에 블록들이 렌더링된다', async () => {
    const { container } = render(<DashboardPage />)
    await waitFor(() => expect(container.querySelector('main')).toBeInTheDocument())
  })
})
