/**
 * U3-7: 거래 등록 + 납부 단계 자동 생성 테스트
 * - 거래 등록 폼 (거래유형·금액·기간)
 * - 저장 시 납부 단계 자동 생성 (계약금→잔금)
 * - 거래 리스트 표시
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/transactions',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/lib/supabase/transactions', () => ({
  listTransactions: jest.fn().mockResolvedValue([
    {
      id: 'tx-001',
      property_road_address: '서울특별시 성동구 옥수로 100',
      deal_type: '매매',
      status: '계약진행',
      price: 500000000,
      contract_date: '2026-05-01',
      end_date: '2026-06-30',
      created_at: '2026-05-07T00:00:00Z',
    },
  ]),
  saveTransaction: jest.fn().mockResolvedValue({ id: 'tx-new' }),
  createDefaultPayments: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/supabase/properties', () => ({
  listProperties: jest.fn().mockResolvedValue([
    { id: 'prop-001', road_address: '서울특별시 성동구 옥수로 100', deal_type: '매매', building_type: '아파트', status: '공실', is_our_property: true, is_watchlist: false, is_priority: false, created_at: '2026-05-07T00:00:00Z' },
  ]),
}))

import TransactionsPage from '@/app/(app)/transactions/page'

describe('TransactionsPage (U3-7)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('거래 목록이 로드된 후 표시된다', async () => {
    render(<TransactionsPage />)
    await waitFor(() => expect(screen.getByText('옥수로 100')).toBeInTheDocument())
    expect(screen.getByText('매매')).toBeInTheDocument()
    expect(screen.getByText('계약진행')).toBeInTheDocument()
  })

  it('"거래 등록" 버튼 클릭 시 폼이 열린다', async () => {
    render(<TransactionsPage />)
    await waitFor(() => screen.getByText('옥수로 100'))
    fireEvent.click(screen.getByRole('button', { name: /거래 등록/ }))
    expect(screen.getByTestId('transaction-form')).toBeInTheDocument()
  })

  it('폼에 거래유형·금액·계약일·종료일 필드가 있다', async () => {
    render(<TransactionsPage />)
    await waitFor(() => screen.getByText('옥수로 100'))
    fireEvent.click(screen.getByRole('button', { name: /거래 등록/ }))
    expect(screen.getByLabelText('거래유형')).toBeInTheDocument()
    expect(screen.getByLabelText('거래금액')).toBeInTheDocument()
    expect(screen.getByLabelText('계약일')).toBeInTheDocument()
    expect(screen.getByLabelText('종료일')).toBeInTheDocument()
  })

  it('저장 시 saveTransaction + createDefaultPayments가 호출된다', async () => {
    const { saveTransaction, createDefaultPayments } = require('@/lib/supabase/transactions')
    render(<TransactionsPage />)
    await waitFor(() => screen.getByText('옥수로 100'))
    fireEvent.click(screen.getByRole('button', { name: /거래 등록/ }))

    // 매물 선택
    fireEvent.change(screen.getByLabelText('매물'), { target: { value: 'prop-001' } })
    // 거래유형
    fireEvent.change(screen.getByLabelText('거래유형'), { target: { value: '매매' } })
    // 거래금액
    fireEvent.change(screen.getByLabelText('거래금액'), { target: { value: '500000000' } })

    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(saveTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ deal_type: '매매', price: 500000000 })
    ))
    await waitFor(() => expect(createDefaultPayments).toHaveBeenCalledWith(
      'tx-new', expect.objectContaining({ deal_type: '매매', price: 500000000 })
    ))
  })

  it('종료일이 계약일보다 빠르면 에러 메시지가 표시되고 저장되지 않는다', async () => {
    const { saveTransaction } = require('@/lib/supabase/transactions')
    render(<TransactionsPage />)
    await waitFor(() => screen.getByText('옥수로 100'))
    fireEvent.click(screen.getByRole('button', { name: /거래 등록/ }))

    fireEvent.change(screen.getByLabelText('매물'), { target: { value: 'prop-001' } })
    fireEvent.change(screen.getByLabelText('거래유형'), { target: { value: '매매' } })
    fireEvent.change(screen.getByLabelText('거래금액'), { target: { value: '500000000' } })
    // 계약일보다 빠른 종료일 입력
    fireEvent.change(screen.getByLabelText('계약일'),  { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('종료일'),  { target: { value: '2026-05-01' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(screen.getByText('종료일은 계약일보다 빠를 수 없습니다.')).toBeInTheDocument()
    )
    expect(saveTransaction).not.toHaveBeenCalled()
  })

  it('저장 후 폼이 닫힌다', async () => {
    render(<TransactionsPage />)
    await waitFor(() => screen.getByText('옥수로 100'))
    fireEvent.click(screen.getByRole('button', { name: /거래 등록/ }))
    fireEvent.change(screen.getByLabelText('매물'), { target: { value: 'prop-001' } })
    fireEvent.change(screen.getByLabelText('거래유형'), { target: { value: '매매' } })
    fireEvent.change(screen.getByLabelText('거래금액'), { target: { value: '500000000' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.queryByTestId('transaction-form')).not.toBeInTheDocument())
  })
})
