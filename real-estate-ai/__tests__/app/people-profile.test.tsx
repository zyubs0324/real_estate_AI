/**
 * U3-6: 인물 프로필 페이지 테스트
 * /people/[id] — 기본정보·역할이력·메모·관심매물
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useParams:  () => ({ id: 'p-001' }),
  usePathname: () => '/people/p-001',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/lib/supabase/people', () => ({
  getPerson: jest.fn().mockResolvedValue({
    id: 'p-001', name: '김철수', phone: '010-1234-5678',
    role: '매도인', warning: true, created_at: '2026-05-07T00:00:00Z',
  }),
  getPersonRelations: jest.fn().mockResolvedValue([
    {
      id: 'r-001', role: '매도인',
      started_at: '2026-01-01', ended_at: null,
      property: { road_address: '서울특별시 성동구 옥수로 100' },
    },
  ]),
  getPersonMemos: jest.fn().mockResolvedValue([
    {
      id: 'm-001', content: '계약 선호 조건 확인 필요',
      type: 'normal', created_at: '2026-05-07T00:00:00Z',
    },
    {
      id: 'm-002', content: '이전 거래 분쟁 이력 있음',
      type: 'warning', created_at: '2026-05-06T00:00:00Z',
    },
  ]),
  addPersonMemo: jest.fn().mockResolvedValue({ id: 'm-new' }),
}))

import PersonProfilePage from '@/app/(app)/people/[id]/page'

describe('PersonProfilePage (U3-6)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('인물 이름·연락처·역할이 표시된다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByText('김철수')).toBeInTheDocument())
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument()
    // 매도인은 기본 정보와 타임라인 양쪽에 있을 수 있으므로 getAllByText 사용
    expect(screen.getAllByText('매도인').length).toBeGreaterThan(0)
  })

  it('warning=true 시 경고 배지가 표시된다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByTestId('warning-badge')).toBeInTheDocument())
  })

  it('역할 이력 타임라인이 표시된다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByTestId('relation-timeline')).toBeInTheDocument())
    expect(screen.getByTestId('relation-timeline')).toHaveTextContent('옥수로 100')
    expect(screen.getByTestId('relation-timeline')).toHaveTextContent('매도인')
  })

  it('메모 목록이 표시된다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => {
      expect(screen.getByText('계약 선호 조건 확인 필요')).toBeInTheDocument()
      expect(screen.getByText('이전 거래 분쟁 이력 있음')).toBeInTheDocument()
    })
  })

  it('메모 추가 후 addPersonMemo가 호출된다', async () => {
    const { addPersonMemo } = require('@/lib/supabase/people')
    render(<PersonProfilePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.change(screen.getByPlaceholderText(/메모 내용/), { target: { value: '신규 메모' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(addPersonMemo).toHaveBeenCalledWith(
      'p-001', expect.objectContaining({ content: '신규 메모' })
    ))
  })

  it('관심 매물 섹션이 표시된다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByTestId('interest-section')).toBeInTheDocument())
  })
})
