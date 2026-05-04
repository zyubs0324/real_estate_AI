import { render, screen } from '@testing-library/react'
import Sidebar from '@/components/layout/Sidebar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href, style }: { children: React.ReactNode; href: string; style?: React.CSSProperties }) => (
    <a href={href} style={style}>{children}</a>
  )
  MockLink.displayName = 'Link'
  return MockLink
})

describe('Sidebar — apple.md §12', () => {
  it('renders the logo text', () => {
    render(<Sidebar />)
    expect(screen.getByText('부동산 AI')).toBeInTheDocument()
  })

  it('renders all navigation items', () => {
    render(<Sidebar />)
    expect(screen.getByText('대시보드')).toBeInTheDocument()
    expect(screen.getByText('매물')).toBeInTheDocument()
    expect(screen.getByText('진단 리포트')).toBeInTheDocument()
    expect(screen.getByText('AI 질의응답')).toBeInTheDocument()
    expect(screen.getByText('인물')).toBeInTheDocument()
    expect(screen.getByText('타부동산')).toBeInTheDocument()
  })

  it('renders section labels (CRM, AI 도구)', () => {
    render(<Sidebar />)
    expect(screen.getByText('CRM')).toBeInTheDocument()
    expect(screen.getByText('AI 도구')).toBeInTheDocument()
  })

  it('renders as an aside element', () => {
    const { container } = render(<Sidebar />)
    expect(container.querySelector('aside')).toBeInTheDocument()
  })

  it('applies glassmorphism background (apple.md §12)', () => {
    const { container } = render(<Sidebar />)
    const aside = container.querySelector('aside') as HTMLElement
    expect(aside.style.background).toBe('rgba(0, 0, 0, 0.85)')
    expect(aside.style.width).toBe('240px')
    expect(aside.style.position).toBe('fixed')
  })

  it('marks current route link with active style (left border white)', () => {
    render(<Sidebar />)
    const dashboardLink = screen.getByText('대시보드').closest('a') as HTMLElement
    // 브라우저가 #ffffff → rgb(255,255,255)로 정규화
    expect(dashboardLink.style.borderLeft).toMatch(/3px solid (white|#ffffff|rgb\(255,\s*255,\s*255\))/i)
  })
})
