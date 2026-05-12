/**
 * U3-4: 매물 상세 슬라이드 패널 테스트
 * 리스트 행 클릭 → 오른쪽 슬라이드 패널 표시
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/properties',
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/components/address/AddressSearch', () => {
  const Mock = () => <div>AddressSearch</div>
  Mock.displayName = 'AddressSearch'
  return Mock
})


jest.mock('@/lib/supabase/properties', () => ({
  saveProperty: jest.fn().mockResolvedValue({ id: 'new-id' }),
  listProperties: jest.fn().mockResolvedValue([
    {
      id: 'prop-001',
      road_address: '서울특별시 성동구 옥수로 100',
      jibun_address: null, building_name: '옥수하이츠',
      building_dong: null, unit_number: '1201호',
      building_type: '아파트', deal_type: '매매', status: '공실',
      is_our_property: true, is_watchlist: false, is_priority: false,
      created_at: '2026-05-07T00:00:00Z',
    },
    {
      id: 'prop-002',
      road_address: '서울특별시 용산구 한남대로 150',
      jibun_address: null, building_name: '한남더힐',
      building_dong: null, unit_number: null,
      building_type: '아파트', deal_type: '전세', status: '임대중',
      is_our_property: true, is_watchlist: false, is_priority: false,
      created_at: '2026-05-07T00:00:00Z',
    },
  ]),
  updatePropertyLabels: jest.fn().mockResolvedValue(undefined),
}))

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

import PropertiesPage from '@/app/(app)/properties/page'

describe('PropertiesPage 슬라이드 패널 (U3-4)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('매물 목록이 로드된 후 행이 표시된다', async () => {
    render(<PropertiesPage />)
    await waitFor(() => expect(screen.getByText('옥수로 100')).toBeInTheDocument())
  })

  it('행 클릭 시 슬라이드 패널이 열린다', async () => {
    render(<PropertiesPage />)
    await waitFor(() => screen.getByText(/옥수로 100/))
    fireEvent.click(screen.getByText(/옥수로 100/))
    expect(screen.getByTestId('property-panel')).toBeInTheDocument()
  })

  it('패널에 매물 주소가 표시된다', async () => {
    render(<PropertiesPage />)
    await waitFor(() => screen.getByText(/옥수로 100/))
    fireEvent.click(screen.getByText(/옥수로 100/))
    const panel = screen.getByTestId('property-panel')
    expect(panel).toHaveTextContent('옥수로 100')
  })

  it('패널에 건물유형·거래유형·상태가 표시된다', async () => {
    render(<PropertiesPage />)
    await waitFor(() => screen.getByText(/옥수로 100/))
    fireEvent.click(screen.getByText(/옥수로 100/))
    const panel = screen.getByTestId('property-panel')
    expect(panel).toHaveTextContent('아파트')
    expect(panel).toHaveTextContent('매매')
    expect(panel).toHaveTextContent('공실')
  })

  it('패널 닫기(×) 버튼 클릭 시 패널이 닫힌다', async () => {
    render(<PropertiesPage />)
    await waitFor(() => screen.getByText(/옥수로 100/))
    fireEvent.click(screen.getByText(/옥수로 100/))
    expect(screen.getByTestId('property-panel')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /닫기/ }))
    expect(screen.queryByTestId('property-panel')).not.toBeInTheDocument()
  })

  it('"우리매물" 라벨 토글이 패널에 표시된다', async () => {
    render(<PropertiesPage />)
    await waitFor(() => screen.getByText(/옥수로 100/))
    fireEvent.click(screen.getByText(/옥수로 100/))
    const panel = screen.getByTestId('property-panel')
    expect(panel).toHaveTextContent('우리매물')
  })

  it('"진단 리포트 보기" 링크가 패널에 표시된다', async () => {
    render(<PropertiesPage />)
    await waitFor(() => screen.getByText(/옥수로 100/))
    fireEvent.click(screen.getByText(/옥수로 100/))
    const panel = screen.getByTestId('property-panel')
    expect(panel).toHaveTextContent('진단 리포트')
  })

  it('마지막 활성 라벨은 해제할 수 없다', async () => {
    // prop-001: is_our_property=true, 나머지 false → 우리매물만 활성
    const { updatePropertyLabels } = require('@/lib/supabase/properties')
    render(<PropertiesPage />)
    await waitFor(() => screen.getByText(/옥수로 100/))
    fireEvent.click(screen.getByText(/옥수로 100/))
    const panel = screen.getByTestId('property-panel')
    // 유일하게 활성인 "우리매물" 버튼 클릭 → 해제 차단
    const ourBtn = within(panel).getByRole('button', { name: '우리매물' })
    fireEvent.click(ourBtn)
    expect(updatePropertyLabels).not.toHaveBeenCalled()
  })
})
