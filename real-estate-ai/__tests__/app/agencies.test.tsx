/**
 * U3-10: 타부동산 관리 테스트
 * - 목록 렌더링
 * - 등록 폼 열기
 * - 부동산중개업 API 자동 조회 → 폼 자동 채움
 * - 저장 → 목록 갱신
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter:   () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/agencies',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/lib/supabase/agencies', () => ({
  listAgencies: jest.fn().mockResolvedValue([
    {
      id:            'agency-001',
      name:          '한강공인중개사사무소',
      representative: '김한강',
      phone:         '02-1234-5678',
      address:       '서울특별시 용산구 한강대로 150',
      license_no:    '11140-2023-01234',
      notes:         null,
      created_at:    '2026-05-07T00:00:00Z',
    },
  ]),
  saveAgency: jest.fn().mockResolvedValue({ id: 'agency-new' }),
}))

jest.mock('@/lib/apis/agency', () => ({
  searchAgency: jest.fn().mockResolvedValue({
    name:           '옥수공인중개사사무소',
    representative: '이옥수',
    phone:          '02-9876-5432',
    address:        '서울특별시 성동구 옥수로 100',
    license_no:     '11200-2022-05678',
  }),
}))

import AgenciesPage from '@/app/(app)/agencies/page'

describe('AgenciesPage (U3-10)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('페이지 제목 "타부동산"을 렌더링한다', async () => {
    render(<AgenciesPage />)
    await waitFor(() => expect(screen.getByText('타부동산')).toBeInTheDocument())
  })

  it('타부동산 목록이 로드 후 표시된다', async () => {
    render(<AgenciesPage />)
    await waitFor(() => expect(screen.getByText('한강공인중개사사무소')).toBeInTheDocument())
    expect(screen.getByText('김한강')).toBeInTheDocument()
    expect(screen.getByText('11140-2023-01234')).toBeInTheDocument()
  })

  it('"타부동산 등록" 버튼 클릭 시 폼이 열린다', async () => {
    render(<AgenciesPage />)
    await waitFor(() => screen.getByText('한강공인중개사사무소'))
    fireEvent.click(screen.getByRole('button', { name: /타부동산 등록/ }))
    expect(screen.getByTestId('agency-form')).toBeInTheDocument()
  })

  it('폼에 상호명·등록번호 검색 버튼이 있다', async () => {
    render(<AgenciesPage />)
    await waitFor(() => screen.getByText('한강공인중개사사무소'))
    fireEvent.click(screen.getByRole('button', { name: /타부동산 등록/ }))
    expect(screen.getByLabelText('상호명')).toBeInTheDocument()
    expect(screen.getByLabelText('등록번호')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /자동 조회/ })).toBeInTheDocument()
  })

  it('자동 조회 후 폼이 자동으로 채워진다', async () => {
    const { searchAgency } = require('@/lib/apis/agency')
    render(<AgenciesPage />)
    await waitFor(() => screen.getByText('한강공인중개사사무소'))
    fireEvent.click(screen.getByRole('button', { name: /타부동산 등록/ }))

    fireEvent.change(screen.getByLabelText('상호명'), {
      target: { value: '옥수공인중개사사무소' },
    })
    fireEvent.click(screen.getByRole('button', { name: /자동 조회/ }))

    await waitFor(() => expect(searchAgency).toHaveBeenCalledWith(
      expect.objectContaining({ name: '옥수공인중개사사무소' })
    ))
    await waitFor(() =>
      expect((screen.getByLabelText('대표자') as HTMLInputElement).value).toBe('이옥수')
    )
    expect((screen.getByLabelText('전화번호') as HTMLInputElement).value).toBe('02-9876-5432')
    expect((screen.getByLabelText('주소') as HTMLInputElement).value).toBe(
      '서울특별시 성동구 옥수로 100'
    )
  })

  it('저장 시 saveAgency가 호출된다', async () => {
    const { saveAgency } = require('@/lib/supabase/agencies')
    render(<AgenciesPage />)
    await waitFor(() => screen.getByText('한강공인중개사사무소'))
    fireEvent.click(screen.getByRole('button', { name: /타부동산 등록/ }))

    fireEvent.change(screen.getByLabelText('상호명'),   { target: { value: '테스트공인중개사' } })
    fireEvent.change(screen.getByLabelText('대표자'),   { target: { value: '홍길동' } })
    fireEvent.change(screen.getByLabelText('전화번호'), { target: { value: '02-0000-0000' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(saveAgency).toHaveBeenCalledWith(
        expect.objectContaining({ name: '테스트공인중개사', representative: '홍길동' })
      )
    )
  })

  it('저장 후 폼이 닫힌다', async () => {
    render(<AgenciesPage />)
    await waitFor(() => screen.getByText('한강공인중개사사무소'))
    fireEvent.click(screen.getByRole('button', { name: /타부동산 등록/ }))
    fireEvent.change(screen.getByLabelText('상호명'), { target: { value: '테스트공인중개사' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.queryByTestId('agency-form')).not.toBeInTheDocument())
  })

  it('목록이 비어있을 때 빈 상태 메시지를 표시한다', async () => {
    const { listAgencies } = require('@/lib/supabase/agencies')
    listAgencies.mockResolvedValueOnce([])
    render(<AgenciesPage />)
    await waitFor(() =>
      expect(screen.getByText(/등록된 타부동산이 없습니다/)).toBeInTheDocument()
    )
  })
})
