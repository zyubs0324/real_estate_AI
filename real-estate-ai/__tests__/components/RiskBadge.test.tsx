/**
 * U2-1: RiskBadge 컴포넌트 테스트
 * apple.md §11 — 상태 색상 시스템
 */
import { render, screen } from '@testing-library/react'
import RiskBadge, { type RiskLevel } from '@/components/report/RiskBadge'

describe('RiskBadge (U2-1)', () => {
  it('위험(danger) 배지를 렌더링한다', () => {
    render(<RiskBadge level="danger" label="위반건축물" />)
    const badge = screen.getByText('위반건축물')
    expect(badge).toBeInTheDocument()
  })

  it('경고(warning) 배지를 렌더링한다', () => {
    render(<RiskBadge level="warning" label="근저당" />)
    expect(screen.getByText('근저당')).toBeInTheDocument()
  })

  it('안전(safe) 배지를 렌더링한다', () => {
    render(<RiskBadge level="safe" label="이상없음" />)
    expect(screen.getByText('이상없음')).toBeInTheDocument()
  })

  it('확인중(pending) 배지를 렌더링한다', () => {
    render(<RiskBadge level="pending" label="확인중" />)
    expect(screen.getByText('확인중')).toBeInTheDocument()
  })

  it('danger 배지는 빨간색 배경을 가진다', () => {
    render(<RiskBadge level="danger" label="위반건축물" />)
    const badge = screen.getByText('위반건축물')
    expect(badge).toHaveStyle({ background: '#ff3b30' })
  })

  it('warning 배지는 주황색 배경을 가진다', () => {
    render(<RiskBadge level="warning" label="근저당" />)
    const badge = screen.getByText('근저당')
    expect(badge).toHaveStyle({ background: '#ff9f0a' })
  })

  it('safe 배지는 초록색 배경을 가진다', () => {
    render(<RiskBadge level="safe" label="이상없음" />)
    const badge = screen.getByText('이상없음')
    expect(badge).toHaveStyle({ background: '#34c759' })
  })

  it('pending 배지는 회색 배경을 가진다', () => {
    render(<RiskBadge level="pending" label="확인중" />)
    const badge = screen.getByText('확인중')
    expect(badge).toHaveStyle({ background: '#636366' })
  })
})
