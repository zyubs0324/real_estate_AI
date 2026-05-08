/**
 * U3-5: 인물 등록 + 동명인 감지 테스트
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/people',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/lib/supabase/people', () => ({
  listPeople: jest.fn().mockResolvedValue([
    { id: 'p-001', name: '김철수', phone: '010-1234-5678', role: '매도인', warning: false, created_at: '2026-05-07T00:00:00Z' },
    { id: 'p-002', name: '이영희', phone: '010-9876-5432', role: '매수인', warning: false, created_at: '2026-05-07T00:00:00Z' },
  ]),
  savePerson: jest.fn().mockResolvedValue({ id: 'p-new' }),
  searchPeopleByName: jest.fn().mockImplementation((name: string) =>
    Promise.resolve(
      name === '김철수'
        ? [{ id: 'p-001', name: '김철수', phone: '010-1234-5678', role: '매도인', warning: false, created_at: '2026-05-07T00:00:00Z' }]
        : []
    )
  ),
  searchPeopleByPhone: jest.fn().mockImplementation((phone: string) =>
    Promise.resolve(
      phone === '010-1234-5678'
        ? [{ id: 'p-001', name: '김철수', phone: '010-1234-5678', role: '매도인', warning: false, created_at: '2026-05-07T00:00:00Z' }]
        : []
    )
  ),
}))

import PeoplePage from '@/app/(app)/people/page'

describe('PeoplePage (U3-5)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('인물 목록이 로드된 후 이름이 표시된다', async () => {
    render(<PeoplePage />)
    await waitFor(() => {
      expect(screen.getByText('김철수')).toBeInTheDocument()
      expect(screen.getByText('이영희')).toBeInTheDocument()
    })
  })

  it('"인물 등록" 버튼 클릭 시 폼이 열린다', async () => {
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    expect(screen.getByTestId('person-form')).toBeInTheDocument()
  })

  it('폼에 이름·연락처·역할 입력 필드가 있다', async () => {
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    expect(screen.getByLabelText('이름')).toBeInTheDocument()
    expect(screen.getByLabelText('연락처')).toBeInTheDocument()
    expect(screen.getByLabelText('역할')).toBeInTheDocument()
  })

  // ── 동명인 드롭다운 ──────────────────────────────────────

  it('이름 입력 시 동명인이 있으면 드롭다운이 표시된다', async () => {
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김철수' } })
    await waitFor(() => expect(screen.getByTestId('duplicate-list')).toBeInTheDocument())
    expect(screen.getByTestId('duplicate-list')).toHaveTextContent('김철수')
  })

  it('동명인이 없으면 드롭다운이 표시되지 않는다', async () => {
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } })
    await waitFor(() => expect(screen.queryByTestId('duplicate-list')).not.toBeInTheDocument())
  })

  it('동명인 드롭다운의 "신규 등록" 클릭 시 드롭다운이 닫힌다', async () => {
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김철수' } })
    await waitFor(() => expect(screen.getByTestId('duplicate-list')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('dup-new-person'))
    expect(screen.queryByTestId('duplicate-list')).not.toBeInTheDocument()
  })

  // ── 전화번호 중복 드롭다운 ───────────────────────────────

  it('이미 등록된 전화번호 입력 시 중복 드롭다운이 표시된다', async () => {
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-1234-5678' } })
    await waitFor(() => expect(screen.getByTestId('phone-duplicate-warning')).toBeInTheDocument())
    expect(screen.getByTestId('phone-duplicate-warning')).toHaveTextContent('김철수')
    expect(screen.getByTestId('phone-duplicate-warning')).toHaveTextContent('010-1234-5678')
  })

  it('등록되지 않은 전화번호 입력 시 중복 드롭다운이 없다', async () => {
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-0000-9999' } })
    await waitFor(() => expect(screen.queryByTestId('phone-duplicate-warning')).not.toBeInTheDocument())
  })

  it('전화번호 중복 드롭다운의 "신규 등록" 클릭 시 드롭다운이 닫힌다', async () => {
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-1234-5678' } })
    await waitFor(() => expect(screen.getByTestId('phone-duplicate-warning')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('phone-dup-new-person'))
    expect(screen.queryByTestId('phone-duplicate-warning')).not.toBeInTheDocument()
  })

  // ── 저장 ─────────────────────────────────────────────────

  it('저장 시 savePerson이 호출되고 폼이 닫힌다', async () => {
    const { savePerson } = require('@/lib/supabase/people')
    render(<PeoplePage />)
    await waitFor(() => screen.getByText('김철수'))
    fireEvent.click(screen.getByRole('button', { name: /인물 등록/ }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '박민준' } })
    fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-0000-1111' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(savePerson).toHaveBeenCalledWith(
      expect.objectContaining({ name: '박민준', phone: '010-0000-1111' })
    ))
    await waitFor(() => expect(screen.queryByTestId('person-form')).not.toBeInTheDocument())
  })
})
