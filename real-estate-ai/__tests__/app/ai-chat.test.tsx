/**
 * U4-2 — AI 질의응답 페이지 테스트
 *
 * - 채팅 입력창과 전송 버튼 렌더링
 * - 질문 제출 시 로딩 표시
 * - 응답 텍스트와 출처 표시
 * - 빈 입력 시 미제출
 * - API 오류 메시지 표시
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// react-markdown은 ESM 전용 패키지 — Jest(CommonJS) 환경에서 mock 처리
jest.mock('react-markdown', () => {
  const MockMarkdown = ({ children }: { children: string }) =>
    <div data-testid="markdown">{children}</div>
  MockMarkdown.displayName = 'ReactMarkdown'
  return MockMarkdown
})

jest.mock('next/navigation', () => ({
  useRouter:   () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/ai-chat',
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

// fetch mock
const mockFetch = jest.fn()
global.fetch = mockFetch

/**
 * JSDOM 호환 SSE 스트림 mock:
 * getReader()를 구현한 body 객체를 반환합니다.
 */
function makeStreamResponse(text: string) {
  const chunks = [
    `data: ${JSON.stringify({ delta: text })}\n\n`,
    'data: [DONE]\n\n',
  ]
  let idx = 0

  const mockReader = {
    read: jest.fn().mockImplementation(async () => {
      if (idx < chunks.length) {
        const chunk = chunks[idx++]
        // Buffer → ArrayBuffer → Uint8Array (JSDOM TextDecoder 호환)
        const buf = Buffer.from(chunk, 'utf-8')
        const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
        return { done: false, value: arr }
      }
      return { done: true, value: undefined }
    }),
  }

  return {
    ok:   true,
    body: { getReader: () => mockReader },
  } as unknown as Response
}

import AiChatPage from '@/app/(app)/ai-chat/page'

describe('U4-2 — AI 질의응답 페이지', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('입력창과 전송 버튼이 렌더링된다', () => {
    render(<AiChatPage />)
    expect(screen.getByPlaceholderText(/질문을 입력/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /전송/ })).toBeInTheDocument()
  })

  it('빈 입력 시 fetch를 호출하지 않는다', () => {
    render(<AiChatPage />)
    fireEvent.click(screen.getByRole('button', { name: /전송/ }))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('질문 제출 시 /api/chat으로 POST 요청을 보낸다', async () => {
    mockFetch.mockResolvedValue(makeStreamResponse('테스트 답변입니다.'))
    render(<AiChatPage />)
    fireEvent.change(screen.getByPlaceholderText(/질문을 입력/), {
      target: { value: '대항력이란 무엇인가요?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /전송/ }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          body:   expect.stringContaining('대항력이란'),
        })
      )
    )
  })

  it('응답이 스트리밍되어 화면에 표시된다', async () => {
    mockFetch.mockResolvedValue(makeStreamResponse('대항력은 제삼자에 대항할 수 있는 권리입니다.'))
    render(<AiChatPage />)
    fireEvent.change(screen.getByPlaceholderText(/질문을 입력/), {
      target: { value: '대항력이란?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /전송/ }))
    await waitFor(() =>
      expect(screen.getByText(/대항력은 제삼자에 대항할 수 있는 권리입니다/)).toBeInTheDocument()
    )
  })

  it('API 오류 시 오류 메시지가 표시된다', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    render(<AiChatPage />)
    fireEvent.change(screen.getByPlaceholderText(/질문을 입력/), {
      target: { value: '질문' },
    })
    fireEvent.click(screen.getByRole('button', { name: /전송/ }))
    await waitFor(() =>
      expect(screen.getByText(/오류가 발생했습니다/)).toBeInTheDocument()
    )
  })

  it('질문이 제출되면 입력창이 비워진다', async () => {
    mockFetch.mockResolvedValue(makeStreamResponse('답변'))
    render(<AiChatPage />)
    const input = screen.getByPlaceholderText(/질문을 입력/) as HTMLInputElement
    fireEvent.change(input, { target: { value: '질문 내용' } })
    fireEvent.click(screen.getByRole('button', { name: /전송/ }))
    await waitFor(() => expect(input.value).toBe(''))
  })
})
