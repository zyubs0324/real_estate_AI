/**
 * U3-9: 홈 대시보드 데이터 연결 테스트
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

// QuickAddressSearch는 복잡한 의존성 → 단순 모킹
jest.mock('@/components/dashboard/QuickAddressSearch', () => {
  const Mock = () => <div data-testid="quick-search">주소 검색</div>
  Mock.displayName = 'QuickAddressSearch'
  return Mock
})

jest.mock('@/lib/supabase/schedules', () => {
  // mock factory 안에서 날짜 계산 (jest.mock 호이스팅 대응)
  const t = new Date(); t.setDate(t.getDate() + 1)
  return {
    listSchedules: jest.fn().mockResolvedValue([
      {
        id:            'sched-001',
        title:         '한남더힐 잔금',
        schedule_type: '잔금',
        due_date:      t.toISOString(),
        is_done:       false,
        memo:          null,
        created_at:    '2026-05-07T00:00:00Z',
      },
    ]),
  }
})

jest.mock('@/lib/supabase/properties', () => ({
  listProperties: jest.fn().mockResolvedValue([
    {
      id: 'prop-001', road_address: '서울특별시 성동구 옥수로 100',
      building_name: '옥수하이츠', building_dong: null, unit_number: '1201호',
      building_type: '공동주택(아파트)', deal_type: '매매', status: '공실',
      is_our_property: true, is_watchlist: false, is_priority: false,
      created_at: '2026-05-07T00:00:00Z',
    },
  ]),
}))

jest.mock('@/lib/supabase/transactions', () => {
  const d = new Date(); d.setDate(d.getDate() + 80)
  const in80 = d.toISOString().split('T')[0]
  return {
    listTransactions: jest.fn().mockResolvedValue([
      {
        id: 'tx-001', property_road_address: '서울특별시 성동구 옥수로 100',
        deal_type: '전세', status: '계약완료',
        price: null, contract_date: '2024-05-01',
        end_date: in80,
        created_at: '2026-05-07T00:00:00Z',
      },
      {
        id: 'tx-002', property_road_address: '서울특별시 용산구 한남대로 150',
        deal_type: '매매', status: '잔금완료',
        price: 800000000, contract_date: '2026-04-01',
        end_date: null, created_at: '2026-05-01T00:00:00Z',
      },
    ]),
  }
})

import DashboardPage from '@/app/(app)/dashboard/page'

describe('DashboardPage (U3-9)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('로드 후 최근 매물 주소가 표시된다', async () => {
    render(<DashboardPage />)
    await waitFor(() => {
      const items = screen.getAllByText(/옥수로 100/)
      expect(items.length).toBeGreaterThan(0)
    })
  })

  it('D+7 이내 일정이 알림 카드에 표시된다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('한남더힐 잔금')).toBeInTheDocument())
  })

  it('D-90 이내 계약 만료 건이 표시된다', async () => {
    render(<DashboardPage />)
    await waitFor(() => {
      const items = screen.getAllByText(/옥수로 100/)
      expect(items.length).toBeGreaterThan(0)
    })
    // D-숫자 배지가 하나 이상 존재해야 함 (알림 D-1 + 만료임박 D-80)
    const dDayItems = await screen.findAllByText(/D-\d+/)
    expect(dDayItems.length).toBeGreaterThan(0)
  })

  it('거래 현황 카드에 상태별 건수가 표시된다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('계약완료')).toBeInTheDocument())
    expect(screen.getByText('잔금완료')).toBeInTheDocument()
  })

  it('수수료 미수령 카드에 잔금완료 건이 표시된다', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText(/한남대로 150/)).toBeInTheDocument())
  })
})
