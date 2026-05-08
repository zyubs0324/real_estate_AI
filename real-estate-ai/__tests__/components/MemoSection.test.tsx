/**
 * U3-11 fix: MemoSection 공용 컴포넌트 테스트
 * - 댓글 스타일: 날짜·타입·내용·삭제 버튼 한 줄
 * - 저장 → 새 줄 추가 (onSave 호출)
 * - 삭제 → 해당 줄 제거 (onDelete 호출)
 * - 저장 실패 시 에러 메시지 표시
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MemoSection from '@/components/common/MemoSection'

const MOCK_MEMOS = [
  {
    id: 'm-001',
    content: '분쟁 이력 있음',
    type: 'warning' as const,
    created_at: '2026-05-07T00:00:00Z',
  },
  {
    id: 'm-002',
    content: '계약 선호 조건 확인',
    type: 'normal' as const,
    created_at: '2026-05-06T00:00:00Z',
  },
]

describe('MemoSection (U3-11)', () => {
  it('메모 목록이 날짜·타입·내용으로 렌더링된다', () => {
    render(
      <MemoSection
        memos={MOCK_MEMOS}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText('분쟁 이력 있음')).toBeInTheDocument()
    expect(screen.getByText('계약 선호 조건 확인')).toBeInTheDocument()
    // 날짜 표시 확인 (2026.05.07 형식)
    expect(screen.getByText('2026.05.07')).toBeInTheDocument()
    expect(screen.getByText('2026.05.06')).toBeInTheDocument()
  })

  it('각 메모에 타입 배지가 표시된다', () => {
    render(
      <MemoSection
        memos={MOCK_MEMOS}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText('주의')).toBeInTheDocument()
    expect(screen.getByText('일반')).toBeInTheDocument()
  })

  it('각 메모에 삭제(×) 버튼이 있다', () => {
    render(
      <MemoSection
        memos={MOCK_MEMOS}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ })
    expect(deleteButtons.length).toBe(2)
  })

  it('삭제 버튼 클릭 시 onDelete가 해당 id로 호출된다', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined)
    render(
      <MemoSection
        memos={MOCK_MEMOS}
        onSave={jest.fn()}
        onDelete={onDelete}
      />
    )
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ })
    fireEvent.click(deleteButtons[0])
    await waitFor(() =>
      expect(onDelete).toHaveBeenCalledWith('m-001')
    )
  })

  it('내용 입력 후 저장 클릭 시 onSave가 호출된다', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined)
    render(
      <MemoSection
        memos={[]}
        onSave={onSave}
        onDelete={jest.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/메모 내용/), {
      target: { value: '새 메모입니다' },
    })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ content: '새 메모입니다', type: 'normal' })
      )
    )
  })

  it('[주의] 선택 후 저장 시 type: warning 으로 호출된다', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined)
    render(
      <MemoSection
        memos={[]}
        onSave={onSave}
        onDelete={jest.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '주의' }))
    fireEvent.change(screen.getByPlaceholderText(/메모 내용/), {
      target: { value: '경고 메모' },
    })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'warning' })
      )
    )
  })

  it('저장 후 입력창이 초기화된다', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined)
    render(
      <MemoSection
        memos={[]}
        onSave={onSave}
        onDelete={jest.fn()}
      />
    )
    const textarea = screen.getByPlaceholderText(/메모 내용/) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '새 메모' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(textarea.value).toBe(''))
  })

  it('저장 실패 시 에러 메시지가 표시된다', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('저장 실패'))
    render(
      <MemoSection
        memos={[]}
        onSave={onSave}
        onDelete={jest.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/메모 내용/), {
      target: { value: '에러 메모' },
    })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() =>
      expect(screen.getByText(/메모 저장에 실패/)).toBeInTheDocument()
    )
  })

  it('내용 없이 저장 클릭 시 onSave가 호출되지 않는다', async () => {
    const onSave = jest.fn()
    render(
      <MemoSection
        memos={[]}
        onSave={onSave}
        onDelete={jest.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await new Promise((r) => setTimeout(r, 50))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('메모가 없을 때 빈 상태 메시지가 표시된다', () => {
    render(
      <MemoSection
        memos={[]}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(/등록된 메모가 없습니다/)).toBeInTheDocument()
  })
})
