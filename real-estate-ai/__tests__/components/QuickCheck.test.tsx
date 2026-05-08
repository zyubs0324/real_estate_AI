/**
 * U2-1: QuickCheck 컴포넌트 테스트
 * Mock 데이터로 위험 태그 목록 렌더링 확인
 */
import { render, screen } from '@testing-library/react'
import QuickCheck, { type QuickCheckResult } from '@/components/report/QuickCheck'

const mockResult: QuickCheckResult = {
  items: [
    { label: '위반건축물', level: 'danger' },
    { label: '근저당', level: 'warning' },
    { label: '토지거래허가구역', level: 'warning' },
    { label: '압류', level: 'safe' },
  ],
  checkedAt: '2026-05-06',
}

describe('QuickCheck (U2-1)', () => {
  it('"Quick Check" 섹션 제목을 렌더링한다', () => {
    render(<QuickCheck result={mockResult} />)
    expect(screen.getByText(/Quick Check/i)).toBeInTheDocument()
  })

  it('위험 태그 목록을 렌더링한다', () => {
    render(<QuickCheck result={mockResult} />)
    expect(screen.getByText('위반건축물')).toBeInTheDocument()
    expect(screen.getByText('근저당')).toBeInTheDocument()
    expect(screen.getByText('토지거래허가구역')).toBeInTheDocument()
  })

  it('확인일자를 표시한다', () => {
    render(<QuickCheck result={mockResult} />)
    expect(screen.getByText(/2026-05-06/)).toBeInTheDocument()
  })

  it('items가 빈 배열이면 "이상없음"을 표시한다', () => {
    render(<QuickCheck result={{ items: [], checkedAt: '2026-05-06' }} />)
    expect(screen.getByText(/이상없음/i)).toBeInTheDocument()
  })

  it('result가 null이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<QuickCheck result={null} />)
    expect(container.firstChild).toBeNull()
  })
})
