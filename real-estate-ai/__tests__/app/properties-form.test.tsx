/**
 * U3-2: 매물 등록 폼 + DB 저장 테스트
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/properties',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

// AddressSearch 모킹 — 선택 시 onSelect 콜백 호출
jest.mock('@/components/address/AddressSearch', () => {
  const MockAddressSearch = ({ onSelect }: { onSelect: (r: unknown) => void }) => (
    <button
      data-testid="mock-address-select"
      onClick={() => onSelect({
        roadAddr: '서울특별시 성동구 옥수로 100',
        jibunAddr: '옥수동 100',
        bdMgtSn: '1120010200100010000000000',
        bdNm: '옥수하이츠',
        siNm: '서울특별시', sggNm: '성동구', emdNm: '옥수동',
        zipNo: '04796', admCd: '', rnMgtSn: '', detBdNmList: '',
        bdKdcd: '1', roadAddrPart1: '서울특별시 성동구 옥수로 100',
      })}
    >
      주소 선택
    </button>
  )
  MockAddressSearch.displayName = 'AddressSearch'
  return MockAddressSearch
})

// Supabase properties 모킹
const mockSaveProperty = jest.fn().mockResolvedValue({ id: 'prop-001' })
jest.mock('@/lib/supabase/properties', () => ({
  saveProperty: (...args: unknown[]) => mockSaveProperty(...args),
  listProperties: jest.fn().mockResolvedValue([]),
}))

// fetch 전역 모킹 (Quick Check 백그라운드 호출)
global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

import PropertiesPage from '@/app/(app)/properties/page'

describe('PropertiesPage 매물 등록 (U3-2)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('"+ 매물 등록" 버튼 클릭 시 등록 폼이 표시된다', () => {
    render(<PropertiesPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /매물 등록/ })[0])
    expect(screen.getByTestId('property-form')).toBeInTheDocument()
  })

  it('폼에 주소 검색, 건물유형, 거래유형, 호수 필드가 있다', () => {
    render(<PropertiesPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /매물 등록/ })[0])
    expect(screen.getByTestId('property-form')).toBeInTheDocument()
    expect(screen.getByLabelText('건물유형')).toBeInTheDocument()
    expect(screen.getByLabelText('거래유형')).toBeInTheDocument()
    expect(screen.getByLabelText('호수')).toBeInTheDocument()
  })

  it('주소 선택 후 폼에 주소가 채워진다', () => {
    render(<PropertiesPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /매물 등록/ })[0])
    fireEvent.click(screen.getByTestId('mock-address-select'))
    expect(screen.getByText(/옥수로 100/)).toBeInTheDocument()
  })

  it('폼 제출 시 saveProperty가 호출된다', async () => {
    render(<PropertiesPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /매물 등록/ })[0])
    fireEvent.click(screen.getByTestId('mock-address-select'))
    fireEvent.click(screen.getByRole('button', { name: /저장/ }))
    await waitFor(() => expect(mockSaveProperty).toHaveBeenCalledTimes(1))
  })

  it('저장 후 폼이 닫힌다', async () => {
    render(<PropertiesPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /매물 등록/ })[0])
    fireEvent.click(screen.getByTestId('mock-address-select'))
    fireEvent.click(screen.getByRole('button', { name: /저장/ }))
    await waitFor(() => expect(screen.queryByTestId('property-form')).not.toBeInTheDocument())
  })
})
