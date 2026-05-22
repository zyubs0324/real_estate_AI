import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockJusoResult = {
  roadAddr: '서울특별시 용산구 독서당로 111',
  jibunAddr: '서울특별시 용산구 한남동 810',
  bdMgtSn: '1117013100108100000000001',
  detBdNmList: '101동',
  bdNm: '한남더힐',
  bdKdcd: '1',
  siNm: '서울특별시',
  sggNm: '용산구',
  emdNm: '한남동',
  zipNo: '04410',
  admCd: '1117013100',
  rnMgtSn: '111704106123',
  roadAddrPart1: '서울특별시 용산구 독서당로 111',
  liNm: '',
  rn: '독서당로',
  udrtYn: '0',
  buldMnnm: 111,
  buldSlno: 0,
  mtYn: '0',
  lnbrMnnm: 810,
  lnbrSlno: 0,
  emdNo: '01',
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/components/address/AddressSearch', () => {
  const MockAddressSearch = ({ onSelect }: { onSelect: (result: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onSelect(mockJusoResult)}
    >
      한남더힐 선택
    </button>
  )
  MockAddressSearch.displayName = 'AddressSearch'
  return MockAddressSearch
})

jest.mock('@/lib/apis/building', () => ({
  buildingQueryFromJuso: jest.fn(() => ({
    sigunguCd: '11170',
    bjdongCd: '13100',
    bun: '0810',
    ji: '0000',
    platGbCd: '0',
  })),
}))

jest.mock('@/lib/supabase/diagnostics', () => ({
  saveDiagnostics: jest.fn().mockResolvedValue(undefined),
}))

import QuickAddressSearch from '@/components/dashboard/QuickAddressSearch'

describe('QuickAddressSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockJusoResult.detBdNmList = '101동'
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/building-units')) {
        return {
          ok: true,
          json: async () => ({ units: [] }),
        } as Response
      }
      if (url.startsWith('/api/property-data')) {
        return {
          ok: true,
          json: async () => ({ building: null, registry: null, vworld: null, deals: [] }),
        } as Response
      }
      return {
        ok: false,
        json: async () => ({}),
      } as Response
    })
  })

  it('전유부 동명이 없어도 Juso 상세건물명 동을 표시한다', async () => {
    render(<QuickAddressSearch />)

    fireEvent.click(screen.getByRole('button', { name: '한남더힐 선택' }))

    await waitFor(() => {
      expect(screen.getByText('동 선택 — 도로명주소 기준')).toBeInTheDocument()
    })
    expect(screen.getByText('101동')).toBeInTheDocument()
  })

  it('Juso 동을 선택하면 조회를 다시 진행한다', async () => {
    mockJusoResult.detBdNmList = '101동,102동'
    render(<QuickAddressSearch />)

    fireEvent.click(screen.getByRole('button', { name: '한남더힐 선택' }))

    await waitFor(() => {
      expect(screen.getByLabelText('동 선택')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/property-data?'))
    })

    const fetchBeforeDongSelect = (global.fetch as jest.Mock).mock.calls.length
    fireEvent.change(screen.getByLabelText('동 선택'), { target: { value: '102동' } })

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchBeforeDongSelect)
  })

  it('filters non-dong annex names from Juso detail building names', async () => {
    mockJusoResult.detBdNmList = '노인정,관리사무실,3동,1동,극동유치원,2동'
    render(<QuickAddressSearch />)

    fireEvent.click(screen.getByRole('button', { name: '한남더힐 선택' }))

    await waitFor(() => {
      expect(screen.getByLabelText('동 선택')).toBeInTheDocument()
    })
    expect(screen.getByRole('option', { name: '1동' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '2동' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '3동' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '극동유치원' })).not.toBeInTheDocument()
  })
})
