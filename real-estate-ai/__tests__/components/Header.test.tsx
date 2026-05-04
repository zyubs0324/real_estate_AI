import { render, screen } from '@testing-library/react'
import Header from '@/components/layout/Header'

describe('Header', () => {
  it('renders the page title area', () => {
    render(<Header title="대시보드" />)
    expect(screen.getByText(/대시보드/i)).toBeInTheDocument()
  })

  it('renders user profile area', () => {
    render(<Header title="대시보드" />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})
