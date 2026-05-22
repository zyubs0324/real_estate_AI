import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

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
      id: 'tx-bulk-1',
      property_road_address: 'Transaction Address',
      deal_type: 'sale',
      status: 'contract',
      price: 100000000,
      contract_date: '2026-05-01',
      end_date: '2026-06-01',
      created_at: '2026-05-20T00:00:00Z',
    },
  ]),
  saveTransaction: jest.fn().mockResolvedValue({ id: 'tx-new' }),
  createDefaultPayments: jest.fn().mockResolvedValue(undefined),
  getTransactionMemos: jest.fn().mockResolvedValue([]),
  addTransactionMemo: jest.fn().mockResolvedValue({ id: 'memo-id' }),
  deleteTransactionMemo: jest.fn().mockResolvedValue(undefined),
  updateTransaction: jest.fn().mockResolvedValue(undefined),
  deleteTransaction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/supabase/properties', () => ({
  listProperties: jest.fn().mockResolvedValue([]),
}))

import TransactionsPage from '@/app/(app)/transactions/page'

describe('TransactionsPage bulk selection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deletes selected transactions after confirmation', async () => {
    const { deleteTransaction } = require('@/lib/supabase/transactions')
    render(<TransactionsPage />)

    await waitFor(() => expect(screen.getByLabelText('select-transaction-tx-bulk-1')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('select-transaction-tx-bulk-1'))
    fireEvent.click(screen.getByRole('button', { name: '선택 1개 삭제' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '선택 거래를 삭제할까요?' })).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleteTransaction).toHaveBeenCalledWith('tx-bulk-1'))
  })
})
