/**
 * U2-6: 진단 리포트 페이지 테스트
 * /report?bdMgtSn=...&admCd=...&roadAddr=...&siNm=...&sggNm=...&emdNm=...
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

// next/navigation 모킹
const mockSearchParams = new URLSearchParams({
  bdMgtSn:  '1120010200100010000000000',
  admCd:    '1120010200',
  lnbrMnnm: '1',
  lnbrSlno: '0',
  mtYn:     '0',
  roadAddr: '서울특별시 성동구 옥수동 옥수로 100',
  siNm:     '서울특별시',
  sggNm:    '성동구',
  emdNm:    '옥수동',
})

describe('ReportPage report history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetchMockOpinion = AI_OPINION
  })

  it('리포트 생성 완료 후 이력을 저장한다', async () => {
    render(<ReportPage />)

    await waitFor(() =>
      expect(saveReportHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          bd_mgt_sn: '1120010200100010000000000',
          report_data: expect.objectContaining({
            aiOpinion: AI_OPINION,
          }),
        })
      )
    )
  })

  it('리포트 이력을 클릭하면 저장된 리포트를 재표시한다', async () => {
    render(<ReportPage />)

    await waitFor(() => expect(screen.getByText('리포트 이력')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /서울특별시 성동구 과거로 10/ }))

    expect(screen.getByText('저장된 리포트 의견')).toBeInTheDocument()
  })
})

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn() }),
}))

// API 모킹
jest.mock('@/lib/apis/building', () => ({
  fetchBuilding: jest.fn().mockResolvedValue({
    buildingName: '옥수하이츠', mainPurpose: '공동주택(아파트)',
    totalFloorArea: 12500.5, groundFloor: 15, undergroundFloor: 2,
    isViolation: false, approvalDate: '2005-06-30',
  }),
  buildingQueryFromJuso: jest.fn().mockReturnValue({
    sigunguCd: '11200', bjdongCd: '10200', bun: '0001', ji: '0000', platGbCd: '0',
  }),
}))

jest.mock('@/lib/apis/registry', () => ({
  fetchRegistry: jest.fn().mockResolvedValue({
    hasMortgage: true, hasSeizure: false, hasAuction: false,
    hasTrust: false, hasLeaseRegistration: false, mortgageAmount: 150000000,
  }),
  toRiskItems: jest.fn().mockReturnValue([{ label: '근저당', level: 'warning' }]),
}))

jest.mock('@/lib/apis/vworld', () => ({
  fetchVWorld: jest.fn().mockResolvedValue({
    landUseZone: '제2종일반주거지역', officialLandPrice: 3850000, pricedAt: '2025',
  }),
}))

jest.mock('@/lib/apis/realPrice', () => ({
  fetchRealPrice: jest.fn().mockResolvedValue([
    { dealYear: 2025, dealMonth: 3, dealDay: 15, apartName: '옥수하이츠',
      area: 84.92, floor: 8, dealAmount: 1050000000, dealType: '매매' },
  ]),
}))

jest.mock('@/lib/regulations', () => ({
  checkRegulations: jest.fn().mockReturnValue({
    isSpeculativeZone: true, isAdjustmentZone: true, isLandTransactionZone: false,
  }),
}))

jest.mock('@/lib/supabase/diagnostics', () => ({
  saveDiagnostics: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/supabase/reportHistory', () => ({
  listReportHistory: jest.fn().mockResolvedValue([
    {
      id: 'history-1',
      road_address: '서울특별시 성동구 과거로 10',
      building_dong: null,
      unit_number: null,
      floor_info: null,
      bd_mgt_sn: 'history-bd',
      report_data: {
        building: null,
        registry: null,
        vworld: null,
        deals: [],
        regs: null,
        quickCheck: { items: [], checkedAt: '2026-05-20' },
        aiOpinion: '저장된 리포트 의견',
      },
      quick_check_summary: '특이사항 없음',
      created_at: '2026-05-20T09:00:00.000Z',
    },
  ]),
  saveReportHistory: jest.fn().mockResolvedValue({ id: 'history-new' }),
}))

// fetch mock — /api/property-data 및 /api/diagnosis/opinion 시뮬레이션
const AI_OPINION = '이 매물은 근저당이 설정되어 있어 주의가 필요합니다. 본 의견은 참고용이며 법적 효력이 없습니다.'
let fetchMockOpinion: string | null = AI_OPINION

const { fetchBuilding: mockFetchBuilding } = require('@/lib/apis/building')
const { fetchRegistry: mockFetchRegistry, toRiskItems: mockToRiskItems } = require('@/lib/apis/registry')
const { fetchVWorld: mockFetchVWorld } = require('@/lib/apis/vworld')
const { fetchRealPrice: mockFetchRealPrice } = require('@/lib/apis/realPrice')

global.fetch = jest.fn().mockImplementation(async (url: string) => {
  if (typeof url === 'string' && url.startsWith('/api/property-data')) {
    const [building, registry, vworld, deals] = await Promise.all([
      mockFetchBuilding(),
      mockFetchRegistry(),
      mockFetchVWorld(),
      mockFetchRealPrice(),
    ])
    return { ok: true, json: () => Promise.resolve({ building, registry, vworld, deals }) }
  }
  if (url === '/api/diagnosis/opinion') {
    return { ok: true, json: () => Promise.resolve({ opinion: fetchMockOpinion }) }
  }
  return Promise.reject(new Error(`Unmocked fetch: ${url}`))
}) as jest.Mock

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

import ReportPage from '@/app/(app)/report/page'
import { saveReportHistory } from '@/lib/supabase/reportHistory'

// 모든 섹션은 비동기 로딩 후 표시 → waitFor/findBy 사용
describe('ReportPage (U2-6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetchMockOpinion = AI_OPINION
  })

  it('페이지 제목 "진단 리포트"를 렌더링한다', () => {
    render(<ReportPage />)
    expect(screen.getByText('진단 리포트')).toBeInTheDocument()
  })

  it('선택된 주소를 표시한다', () => {
    render(<ReportPage />)
    expect(screen.getByText(/옥수동 옥수로 100/)).toBeInTheDocument()
  })

  it('A섹션 Quick Check를 렌더링한다', async () => {
    render(<ReportPage />)
    await waitFor(() => expect(screen.getByTestId('section-a')).toBeInTheDocument())
  })

  it('B섹션 권리관계를 렌더링한다', async () => {
    render(<ReportPage />)
    await waitFor(() => {
      expect(screen.getByText('권리관계 분석')).toBeInTheDocument()
      expect(screen.getByTestId('section-b')).toBeInTheDocument()
    })
  })

  it('C섹션 건축물 현황을 렌더링한다', async () => {
    render(<ReportPage />)
    await waitFor(() => expect(screen.getByText('건축물 현황')).toBeInTheDocument())
  })

  it('D섹션 규제지역을 렌더링한다', async () => {
    render(<ReportPage />)
    await waitFor(() => expect(screen.getByText('규제지역')).toBeInTheDocument())
  })

  it('E섹션 토지·용도를 렌더링한다', async () => {
    render(<ReportPage />)
    await waitFor(() => expect(screen.getByText('토지·용도지역')).toBeInTheDocument())
  })

  it('F섹션 실거래가를 렌더링한다', async () => {
    render(<ReportPage />)
    await waitFor(() => expect(screen.getByText('실거래가')).toBeInTheDocument())
  })

  it('G섹션 AI 종합 의견 섹션 헤더를 렌더링한다', async () => {
    render(<ReportPage />)
    await waitFor(() => expect(screen.getByText('AI 종합 의견')).toBeInTheDocument())
  })

  it('G섹션 데이터 로드 후 AI 의견을 표시한다', async () => {
    render(<ReportPage />)
    await waitFor(() =>
      expect(screen.getByText(/이 매물은 근저당이 설정되어 있어/)).toBeInTheDocument()
    )
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/diagnosis/opinion',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('G섹션 AI 의견 생성 실패 시 오류 메시지를 표시한다', async () => {
    fetchMockOpinion = null
    render(<ReportPage />)
    await waitFor(() =>
      expect(screen.getByText('AI 종합 의견')).toBeInTheDocument()
    )
    await waitFor(() =>
      expect(screen.getByText(/AI 의견을 생성하지 못했습니다/)).toBeInTheDocument()
    )
  })

  it('리포트 한계 고지 문구가 표시된다', async () => {
    render(<ReportPage />)
    await waitFor(() =>
      expect(screen.getByText(/본 리포트는 참고용/)).toBeInTheDocument()
    )
  })
})
