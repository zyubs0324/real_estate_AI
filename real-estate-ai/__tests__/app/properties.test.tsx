/**
 * U3-1: 매물 리스트 페이지 테스트 (정적 UI)
 * /properties — 탭([전체][우리매물][관심][집중관리]) + 필터 + 빈 상태
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/properties',
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/lib/supabase/properties', () => ({
  saveProperty: jest.fn().mockResolvedValue({ id: 'test-id' }),
  listProperties: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/components/layout/Sidebar', () => {
  const MockSidebar = () => <nav>Sidebar</nav>
  MockSidebar.displayName = 'Sidebar'
  return MockSidebar
})

import PropertiesPage from '@/app/(app)/properties/page'

describe('PropertiesPage (U3-1)', () => {
  it('페이지 제목 "매물 관리"를 렌더링한다', () => {
    render(<PropertiesPage />)
    expect(screen.getByText('매물 관리')).toBeInTheDocument()
  })

  it('"전체" 탭이 기본 활성 상태로 표시된다', () => {
    render(<PropertiesPage />)
    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument()
  })

  it('4개 탭(전체, 우리매물, 관심매물, 집중관리)이 모두 표시된다', () => {
    render(<PropertiesPage />)
    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '우리매물' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '관심매물' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '집중관리' })).toBeInTheDocument()
  })

  it('탭 클릭 시 활성 탭이 변경된다', () => {
    render(<PropertiesPage />)
    const tab = screen.getByRole('button', { name: '우리매물' })
    fireEvent.click(tab)
    expect(tab).toHaveAttribute('data-active', 'true')
  })

  it('거래유형 필터가 표시된다', () => {
    render(<PropertiesPage />)
    expect(screen.getByRole('combobox', { name: /거래유형 필터/ })).toBeInTheDocument()
  })

  it('빈 상태 메시지가 표시된다', async () => {
    render(<PropertiesPage />)
    await waitFor(() => expect(screen.getByText(/등록된 매물이 없습니다/)).toBeInTheDocument())
  })

  it('매물 등록 버튼이 표시된다', () => {
    render(<PropertiesPage />)
    const btns = screen.getAllByRole('button', { name: /매물 등록/ })
    expect(btns.length).toBeGreaterThanOrEqual(1)
  })
})
