import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
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
      id: 'agency-bulk-1',
      name: 'Partner Agency',
      alias: 'Partner',
      representative: 'Manager',
      phone: '02-1111-2222',
      address: 'Agency Address',
      license_no: 'license-1',
      notes: null,
      is_our_office: false,
      trust_level: '일반',
      tags: [],
      handling_count: 0,
      co_broker_count: 0,
      created_at: '2026-05-20T00:00:00Z',
    },
  ]),
  saveAgency: jest.fn().mockResolvedValue({ id: 'agency-new' }),
  updateAgency: jest.fn().mockResolvedValue(undefined),
  deleteAgency: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/apis/agency', () => ({
  searchAgency: jest.fn().mockResolvedValue(null),
}))

import AgenciesPage from '@/app/(app)/agencies/page'

describe('AgenciesPage bulk selection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deletes selected agencies after confirmation', async () => {
    const { deleteAgency } = require('@/lib/supabase/agencies')
    render(<AgenciesPage />)

    await waitFor(() => expect(screen.getByLabelText('select-agency-agency-bulk-1')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('select-agency-agency-bulk-1'))
    fireEvent.click(screen.getByRole('button', { name: '선택 1개 삭제' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '선택 부동산을 삭제할까요?' })).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleteAgency).toHaveBeenCalledWith('agency-bulk-1'))
  })
})
