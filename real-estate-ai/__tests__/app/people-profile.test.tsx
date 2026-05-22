import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const push = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn() }),
  useParams: () => ({ id: 'p-001' }),
  usePathname: () => '/people/p-001',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/lib/supabase/people', () => ({
  getPerson: jest.fn().mockResolvedValue({
    id: 'p-001',
    name: '김철수',
    phone: '010-1234-5678',
    role: '매도인',
    warning: true,
    created_at: '2026-05-07T00:00:00Z',
  }),
  getPersonRelations: jest.fn().mockResolvedValue([
    {
      id: 'r-001',
      role: '매도인',
      started_at: '2026-01-01',
      ended_at: null,
      property: {
        road_address: '서울특별시 성동구 옥수로 100',
        handling_name: '한자리',
        neighborhood: '옥수동',
        alias: '옥파',
        deal_type: '전세',
        price_text: '8억',
        area_text: '33평',
      },
    },
  ]),
  getPersonOwnedPropertyGroups: jest.fn().mockResolvedValue([
    {
      unit_key: '옥수동 옥파 108 505|108|505',
      road_address: '옥수동 옥파 108 505',
      building_dong: '108',
      unit_number: '505',
      share_ratio: '50%',
      is_primary: true,
      listings: [
        {
          id: 'prop-1',
          road_address: '옥수동 옥파 108 505',
          handling_name: '한자리',
          neighborhood: '옥수동',
          alias: '옥파',
          building_dong: '108',
          unit_number: '505',
          deal_type: '전세',
          price_text: '8억',
          area_text: '33평',
        },
        {
          id: 'prop-2',
          road_address: '옥수동 옥파 108 505',
          handling_name: '한자리',
          neighborhood: '옥수동',
          alias: '옥파',
          building_dong: '108',
          unit_number: '505',
          deal_type: '반월세',
          price_text: '7억/100',
          area_text: '33평',
        },
      ],
    },
  ]),
  getPersonMemos: jest.fn().mockResolvedValue([
    {
      id: 'm-001',
      content: '계약 선호 조건 확인 필요',
      type: 'normal',
      created_at: '2026-05-07T00:00:00Z',
    },
    {
      id: 'm-002',
      content: '이전 거래 분쟁 이력 있음',
      type: 'warning',
      created_at: '2026-05-06T00:00:00Z',
    },
  ]),
  addPersonMemo: jest.fn().mockResolvedValue({ id: 'm-new' }),
  deletePersonMemo: jest.fn().mockResolvedValue(undefined),
}))

import PersonProfilePage from '@/app/(app)/people/[id]/page'

describe('PersonProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    push.mockClear()
  })

  it('인물 기본 정보를 표시한다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByText('김철수')).toBeInTheDocument())
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument()
    expect(screen.getAllByText('매도인').length).toBeGreaterThan(0)
  })

  it('warning=true이면 경고 배지를 표시한다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByTestId('warning-badge')).toBeInTheDocument())
  })

  it('역할 이력 타임라인을 표시한다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByTestId('relation-timeline')).toBeInTheDocument())
    expect(screen.getByTestId('relation-timeline')).toHaveTextContent('옥수동')
    expect(screen.getByTestId('relation-timeline')).toHaveTextContent('매도인')
  })

  it('메모 목록을 표시한다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => {
      expect(screen.getByText('계약 선호 조건 확인 필요')).toBeInTheDocument()
      expect(screen.getByText('이전 거래 분쟁 이력 있음')).toBeInTheDocument()
    })
  })

  it('메모 추가 시 addPersonMemo가 호출된다', async () => {
    const { addPersonMemo } = require('@/lib/supabase/people')
    render(<PersonProfilePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.change(screen.getByPlaceholderText(/메모 내용/), { target: { value: '신규 메모' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(addPersonMemo).toHaveBeenCalledWith(
      'p-001',
      expect.objectContaining({ content: '신규 메모' }),
    ))
  })

  it('관련 매물 섹션을 표시한다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByTestId('interest-section')).toBeInTheDocument())
  })

  it('소유 매물을 실물 단위로 묶고 거래유형별 등록 건을 보여준다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByTestId('owned-properties-section')).toBeInTheDocument())
    expect(screen.getByText('옥수동 옥파 108 505 108 505')).toBeInTheDocument()
    expect(screen.getByText(/등록 2건/)).toBeInTheDocument()
    expect(screen.getByText('전세')).toBeInTheDocument()
    expect(screen.getByText('반월세')).toBeInTheDocument()
  })
})
