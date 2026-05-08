/**
 * U2-6: 진단 리포트 페이지 테스트
 * /report?bdMgtSn=...&roadAddr=...&siNm=...&sggNm=...&emdNm=...
 */
import { render, screen, waitFor } from '@testing-library/react'

// next/navigation 모킹
const mockSearchParams = new URLSearchParams({
  bdMgtSn: '1120010200100010000000000',
  roadAddr: '서울특별시 성동구 옥수동 옥수로 100',
  siNm: '서울특별시',
  sggNm: '성동구',
  emdNm: '옥수동',
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

jest.mock('@/lib/github-ai', () => ({
  generateDiagnosisOpinion: jest.fn().mockResolvedValue(
    '이 매물은 근저당이 설정되어 있어 주의가 필요합니다. 본 의견은 참고용이며 법적 효력이 없습니다.'
  ),
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

import ReportPage from '@/app/(app)/report/page'

// 모든 섹션은 비동기 로딩 후 표시 → waitFor/findBy 사용
describe('ReportPage (U2-6)', () => {
  beforeEach(() => jest.clearAllMocks())

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
    const { generateDiagnosisOpinion } = jest.requireMock('@/lib/github-ai')
    render(<ReportPage />)
    await waitFor(() =>
      expect(screen.getByText(/이 매물은 근저당이 설정되어 있어/)).toBeInTheDocument()
    )
    expect(generateDiagnosisOpinion).toHaveBeenCalledWith(
      expect.objectContaining({ address: expect.stringContaining('옥수') })
    )
  })

  it('G섹션 AI 의견 생성 실패 시 오류 메시지를 표시한다', async () => {
    const { generateDiagnosisOpinion } = jest.requireMock('@/lib/github-ai')
    generateDiagnosisOpinion.mockResolvedValueOnce(null)
    render(<ReportPage />)
    await waitFor(() =>
      expect(screen.getByText('AI 종합 의견')).toBeInTheDocument()
    )
    await waitFor(() =>
      expect(screen.getByText(/AI 의견을 생성하지 못했습니다|잠시 후 다시 시도|데이터 없음/)).toBeInTheDocument()
    )
  })

  it('리포트 한계 고지 문구가 표시된다', async () => {
    render(<ReportPage />)
    await waitFor(() =>
      expect(screen.getByText(/본 리포트는 참고용/)).toBeInTheDocument()
    )
  })
})
