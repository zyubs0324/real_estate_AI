/**
 * U3-11: 메모 + 경고 배지 테스트
 *
 * 인물 목록 — warning=true 배지 표시
 * 인물 프로필 — warning 메모 저장 후 배지 갱신
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter:   () => ({ push: jest.fn(), back: jest.fn() }),
  useParams:   () => ({ id: 'p-001' }),
  usePathname: () => '/people/p-001',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

// jest.mock 호이스팅 대응 — factory 안에서 fn 정의
jest.mock('@/lib/supabase/people', () => ({
  getPerson: jest.fn(),
  getPersonRelations:  jest.fn().mockResolvedValue([]),
  getPersonMemos:      jest.fn().mockResolvedValue([]),
  addPersonMemo:       jest.fn().mockResolvedValue({ id: 'm-new' }),
  listPeople: jest.fn().mockResolvedValue([
    { id: 'p-001', name: '김경고', phone: '010-1111-2222', role: '매도인', warning: true,  created_at: '2026-05-07T00:00:00Z' },
    { id: 'p-002', name: '이일반', phone: '010-3333-4444', role: '매수인', warning: false, created_at: '2026-05-07T00:00:00Z' },
  ]),
  savePerson:          jest.fn().mockResolvedValue({ id: 'p-new' }),
  searchPeopleByName:  jest.fn().mockResolvedValue([]),
  searchPeopleByPhone: jest.fn().mockResolvedValue([]),
}))

import PersonProfilePage from '@/app/(app)/people/[id]/page'
import PeoplePage         from '@/app/(app)/people/page'

// ──────────────────────────────────────────────────────────
// Part A: 인물 프로필 — warning 메모 저장 + 배지 갱신
// ──────────────────────────────────────────────────────────
describe('U3-11 — 인물 프로필 메모 + 경고 배지', () => {
  const personBase = {
    id: 'p-001', name: '홍길동', phone: '010-0000-0001',
    role: '매도인', created_at: '2026-05-07T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { getPerson } = require('@/lib/supabase/people')
    // 첫 호출: warning=false, 재호출: warning=true
    getPerson
      .mockResolvedValueOnce({ ...personBase, warning: false })
      .mockResolvedValue(   { ...personBase, warning: true  })
  })

  it('초기 warning=false 시 경고 배지가 없다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => expect(screen.getByText('홍길동')).toBeInTheDocument())
    expect(screen.queryByTestId('warning-badge')).not.toBeInTheDocument()
  })

  it('"주의" 유형 선택 후 메모 저장 시 addPersonMemo(type:warning) 호출', async () => {
    const { addPersonMemo } = require('@/lib/supabase/people')
    render(<PersonProfilePage />)
    await waitFor(() => screen.getByText('홍길동'))

    fireEvent.click(screen.getByRole('button', { name: '주의' }))
    fireEvent.change(screen.getByPlaceholderText(/메모 내용/), {
      target: { value: '분쟁 이력 있음' },
    })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(addPersonMemo).toHaveBeenCalledWith(
        'p-001',
        expect.objectContaining({ content: '분쟁 이력 있음', type: 'warning' })
      )
    )
  })

  it('메모 저장 후 재조회 시 warning 배지가 표시된다', async () => {
    render(<PersonProfilePage />)
    await waitFor(() => screen.getByText('홍길동'))

    fireEvent.click(screen.getByRole('button', { name: '주의' }))
    fireEvent.change(screen.getByPlaceholderText(/메모 내용/), {
      target: { value: '분쟁 이력 있음' },
    })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    // 저장 후 load() 재실행 → getPerson 2번째 반환값(warning=true)
    await waitFor(() =>
      expect(screen.getByTestId('warning-badge')).toBeInTheDocument()
    )
  })
})

// ──────────────────────────────────────────────────────────
// Part B: 인물 목록 — 경고 배지 표시
// ──────────────────────────────────────────────────────────
describe('U3-11 — 인물 목록 경고 배지', () => {
  beforeEach(() => jest.clearAllMocks())

  it('warning=true 인물에 "경고" 배지가 표시된다', async () => {
    render(<PeoplePage />)
    await waitFor(() => expect(screen.getByText('김경고')).toBeInTheDocument())
    expect(screen.getByText('경고')).toBeInTheDocument()
  })

  it('warning=false 인물에는 경고 배지가 없어 배지는 1개뿐이다', async () => {
    render(<PeoplePage />)
    await waitFor(() => expect(screen.getByText('이일반')).toBeInTheDocument())
    expect(screen.getAllByText('경고').length).toBe(1)
  })
})
