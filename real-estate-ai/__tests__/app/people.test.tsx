import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

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
    { id: 'person-bulk-1', name: 'Owner One', phone: '010-1111-2222', role: 'seller', warning: false, created_at: '2026-05-20T00:00:00Z' },
  ]),
  savePerson: jest.fn().mockResolvedValue({ id: 'p-new' }),
  searchPeopleByName: jest.fn().mockResolvedValue([]),
  searchPeopleByPhone: jest.fn().mockResolvedValue([]),
  updatePerson: jest.fn().mockResolvedValue(undefined),
  deletePerson: jest.fn().mockResolvedValue(undefined),
}))

import PeoplePage from '@/app/(app)/people/page'

describe('PeoplePage bulk selection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deletes selected people after confirmation', async () => {
    const { deletePerson } = require('@/lib/supabase/people')
    render(<PeoplePage />)

    await waitFor(() => expect(screen.getByText('Owner One')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('select-person-person-bulk-1'))
    fireEvent.click(screen.getByRole('button', { name: '선택 1개 삭제' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '선택 인물을 삭제할까요?' })).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deletePerson).toHaveBeenCalledWith('person-bulk-1'))
  })
})
