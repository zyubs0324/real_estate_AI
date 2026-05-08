/**
 * U3-8: 일정 등록 + D-1 이메일 알림 테스트
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter:   () => ({ push: jest.fn(), refresh: jest.fn() }),
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
      id:            'sched-001',
      title:         '옥수로 100 계약 체결',
      schedule_type: '계약',
      due_date:      '2026-05-10T14:00:00Z',
      is_done:       false,
      memo:          '매도인·매수인 동반 방문',
      created_at:    '2026-05-07T00:00:00Z',
    },
  ]),
  saveSchedule: jest.fn().mockResolvedValue({ id: 'sched-new' }),
}))

import SchedulesPage from '@/app/(app)/schedules/page'

describe('SchedulesPage (U3-8)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('일정 목록이 로드된 후 표시된다', async () => {
    render(<SchedulesPage />)
    await waitFor(() => expect(screen.getByText('옥수로 100 계약 체결')).toBeInTheDocument())
    expect(screen.getByText('계약')).toBeInTheDocument()
  })

  it('"일정 등록" 버튼 클릭 시 폼이 열린다', async () => {
    render(<SchedulesPage />)
    await waitFor(() => screen.getByText('옥수로 100 계약 체결'))
    fireEvent.click(screen.getByRole('button', { name: /일정 등록/ }))
    expect(screen.getByTestId('schedule-form')).toBeInTheDocument()
  })

  it('폼에 제목·유형·일시·메모 필드가 있다', async () => {
    render(<SchedulesPage />)
    await waitFor(() => screen.getByText('옥수로 100 계약 체결'))
    fireEvent.click(screen.getByRole('button', { name: /일정 등록/ }))
    expect(screen.getByLabelText('제목')).toBeInTheDocument()
    expect(screen.getByLabelText('유형')).toBeInTheDocument()
    expect(screen.getByLabelText('일시')).toBeInTheDocument()
    expect(screen.getByLabelText('메모')).toBeInTheDocument()
  })

  it('저장 시 saveSchedule이 호출된다', async () => {
    const { saveSchedule } = require('@/lib/supabase/schedules')
    render(<SchedulesPage />)
    await waitFor(() => screen.getByText('옥수로 100 계약 체결'))
    fireEvent.click(screen.getByRole('button', { name: /일정 등록/ }))

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '잔금 처리' } })
    fireEvent.change(screen.getByLabelText('유형'),  { target: { value: '잔금' } })
    fireEvent.change(screen.getByLabelText('일시'),  { target: { value: '2026-05-20T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(saveSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ title: '잔금 처리', schedule_type: '잔금' })
    ))
  })

  it('저장 후 폼이 닫힌다', async () => {
    render(<SchedulesPage />)
    await waitFor(() => screen.getByText('옥수로 100 계약 체결'))
    fireEvent.click(screen.getByRole('button', { name: /일정 등록/ }))
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '잔금 처리' } })
    fireEvent.change(screen.getByLabelText('유형'),  { target: { value: '잔금' } })
    fireEvent.change(screen.getByLabelText('일시'),  { target: { value: '2026-05-20T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.queryByTestId('schedule-form')).not.toBeInTheDocument())
  })
})
