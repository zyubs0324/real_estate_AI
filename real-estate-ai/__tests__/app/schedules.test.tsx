import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/schedules',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/lib/supabase/schedules', () => ({
  listSchedules: jest.fn().mockResolvedValue([
    {
      id: 'schedule-bulk-1',
      title: 'Contract meeting',
      schedule_type: 'contract',
      due_date: '2026-05-20T10:00:00Z',
      is_done: false,
      memo: null,
      created_at: '2026-05-20T00:00:00Z',
    },
  ]),
  saveSchedule: jest.fn().mockResolvedValue({ id: 'schedule-new' }),
  updateSchedule: jest.fn().mockResolvedValue(undefined),
  deleteSchedule: jest.fn().mockResolvedValue(undefined),
}))

import SchedulesPage from '@/app/(app)/schedules/page'

describe('SchedulesPage bulk selection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deletes selected schedules after confirmation', async () => {
    const { deleteSchedule } = require('@/lib/supabase/schedules')
    render(<SchedulesPage />)

    await waitFor(() => expect(screen.getByLabelText('select-schedule-schedule-bulk-1')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('select-schedule-schedule-bulk-1'))
    fireEvent.click(screen.getByRole('button', { name: '선택 1개 삭제' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '선택 일정을 삭제할까요?' })).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleteSchedule).toHaveBeenCalledWith('schedule-bulk-1'))
  })
})
