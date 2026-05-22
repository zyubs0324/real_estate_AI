import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const push = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn() }),
  useParams: () => ({ id: 'agency-001' }),
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/components/common/MemoSection', () => {
  const MockMemoSection = () => <div data-testid="memo-section">memo</div>
  MockMemoSection.displayName = 'MemoSection'
  return MockMemoSection
})

jest.mock('@/lib/supabase/agencies', () => ({
  getAgency: jest.fn().mockResolvedValue({
    id: 'agency-001',
    name: '경희부동산',
    representative: '김대표',
    phone: '02-0000-0000',
    address: null,
    license_no: null,
    notes: null,
    warning: false,
    is_our_office: false,
    alias: '경희',
    trust_level: '신뢰',
    tags: ['협조적'],
    created_at: '2026-05-01T00:00:00Z',
  }),
  updateAgency: jest.fn().mockResolvedValue(undefined),
  getAgencyMemos: jest.fn().mockResolvedValue([]),
  addAgencyMemo: jest.fn().mockResolvedValue({ id: 'memo-001' }),
  deleteAgencyMemo: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/supabase/properties', () => ({
  listProperties: jest.fn()
    .mockResolvedValueOnce([
      {
        id: 'prop-handling',
        road_address: '서울특별시 성동구 옥수로 100',
        handling_name: '경희',
        neighborhood: '옥수동',
        alias: '극동',
        deal_type: '매매',
        price_text: '12억',
        area_text: '33평',
      },
    ])
    .mockResolvedValueOnce([
      {
        id: 'prop-co-broker',
        road_address: '서울특별시 성동구 독서당로 200',
        handling_name: '한자리',
        neighborhood: '옥수동',
        alias: '그린',
        deal_type: '전세',
        price_text: '7억',
        area_text: '25평',
      },
    ]),
}))

import AgencyDetailPage from '@/app/(app)/agencies/[id]/page'

describe('AgencyDetailPage CRM 확장', () => {
  beforeEach(() => push.mockClear())

  it('핸들링 매물과 공동 중개 매물 요약을 표시하고 매물 상세로 이동한다', async () => {
    render(<AgencyDetailPage />)

    await waitFor(() => expect(screen.getAllByText('경희부동산').length).toBeGreaterThan(0))
    expect(screen.getByTestId('handling-properties-section')).toHaveTextContent('극동')
    expect(screen.getByTestId('handling-properties-section')).toHaveTextContent('매매')
    expect(screen.getByTestId('co-broker-properties-section')).toHaveTextContent('그린')
    expect(screen.getByTestId('co-broker-properties-section')).toHaveTextContent('전세')

    fireEvent.click(screen.getByRole('button', { name: /극동/ }))
    expect(push).toHaveBeenCalledWith('/properties?handlingAgencyId=agency-001')
  })
})
