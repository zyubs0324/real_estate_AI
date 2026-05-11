'use client'

/**
 * U4-2 — AI 질의응답 페이지
 * RAG 기반 부동산 법률·정책 질의응답 (Claude claude-sonnet-4-5)
 * - 마크다운 렌더링 (react-markdown)
 * - 대화 히스토리 유지
 */

import { useCallback, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import Header from '@/components/layout/Header'

// ─── 타입 ─────────────────────────────────────────────────
interface Message {
  role:    'user' | 'assistant'
  content: string
  error?:  boolean
}

// ─── 스타일 ──────────────────────────────────────────────
const S = {
  main: {
    flex: 1, display: 'flex' as const, flexDirection: 'column' as const,
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    background: '#f5f5f7', height: '100vh', overflow: 'hidden',
  },
  chatArea: {
    flex: 1, overflowY: 'auto' as const,
    padding: '24px', display: 'flex' as const,
    flexDirection: 'column' as const, gap: 16,
  },
  emptyState: {
    flex: 1, display: 'flex' as const, flexDirection: 'column' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    color: 'rgba(0,0,0,0.35)', gap: 12,
  },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1d1d1f' },
  emptyDesc:  { fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center' as const, maxWidth: 300 },
  userBubble: {
    maxWidth:  '80%',
    alignSelf: 'flex-end' as const,
    background: '#0071e3',
    color:      '#fff',
    borderRadius: '18px 18px 4px 18px',
    padding: '12px 16px',
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
    wordBreak:  'keep-all' as const,
  },
  assistantBubble: (error?: boolean) => ({
    maxWidth:  '85%',
    alignSelf: 'flex-start' as const,
    background: error ? '#fff2f2' : '#fff',
    color:      error ? '#ff3b30' : '#1d1d1f',
    borderRadius: '18px 18px 18px 4px',
    padding: '14px 18px',
    fontSize: 14,
    lineHeight: 1.75,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    wordBreak: 'keep-all' as const,
  }),
  thinking: {
    alignSelf: 'flex-start' as const,
    background: '#fff',
    borderRadius: '18px 18px 18px 4px',
    padding: '12px 16px',
    fontSize: 13,
    color: 'rgba(0,0,0,0.4)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  inputBar: {
    borderTop: '1px solid rgba(0,0,0,0.08)',
    background: 'rgba(245,245,247,0.9)',
    backdropFilter: 'blur(10px)',
    padding: '16px 24px',
    display: 'flex' as const, gap: 10, alignItems: 'flex-end' as const,
  },
  input: {
    flex: 1,
    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12,
    padding: '11px 14px', fontSize: 14, color: '#1d1d1f',
    fontFamily: 'inherit', outline: 'none',
    resize: 'none' as const, minHeight: 44, maxHeight: 120,
    lineHeight: 1.5, overflowY: 'auto' as const,
    background: '#fff',
  },
  sendBtn: (disabled: boolean) => ({
    background: disabled ? 'rgba(0,0,0,0.1)' : '#0071e3',
    color:      disabled ? 'rgba(0,0,0,0.3)' : '#fff',
    border: 'none', borderRadius: 10,
    padding: '10px 18px', fontSize: 13, fontWeight: 600,
    cursor:   disabled ? 'not-allowed' as const : 'pointer' as const,
    fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
    flexShrink: 0, height: 44,
  }),
  notice: {
    padding: '8px 24px 0',
    fontSize: 11, color: 'rgba(0,0,0,0.35)', textAlign: 'center' as const,
  },
}

// 마크다운 컴포넌트 스타일
const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 4 }}>{children}</div>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, marginTop: 10 }}>{children}</div>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, marginTop: 8 }}>{children}</div>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: '4px 0', lineHeight: 1.75 }}>{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ margin: '3px 0', lineHeight: 1.65 }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 700, color: '#1d1d1f' }}>{children}</strong>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote style={{
      borderLeft: '3px solid #0071e3', margin: '8px 0',
      paddingLeft: 12, color: 'rgba(0,0,0,0.6)', fontStyle: 'italic',
    }}>{children}</blockquote>
  ),
}

const EXAMPLE_QUESTIONS = [
  '전세사기 예방을 위해 확인해야 할 서류는?',
  '임차인의 대항력과 우선변제권 차이는?',
  '부동산 거래 신고 기한과 위반 시 과태료는?',
]

// ─── 채팅 버블 ────────────────────────────────────────────
function ChatBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return <div style={S.userBubble}>{msg.content}</div>
  }
  return (
    <div style={S.assistantBubble(msg.error)}>
      {msg.error
        ? msg.content
        : <ReactMarkdown components={mdComponents as never}>{msg.content}</ReactMarkdown>
      }
    </div>
  )
}

// ─── 페이지 ──────────────────────────────────────────────
export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const handleSubmit = useCallback(async () => {
    const question = input.trim()
    if (!question || loading) return

    setInput('')
    const newUserMsg: Message = { role: 'user', content: question }
    setMessages((prev) => [...prev, newUserMsg])
    setLoading(true)
    scrollToBottom()

    // 빈 어시스턴트 버블 추가 (스트리밍 채움용)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      // 대화 히스토리: 현재 질문 직전까지의 완성된 메시지들
      const history = messages
        .filter((m) => m.content.trim() && !m.error)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question, history }),
      })

      if (!res.ok) throw new Error('API 오류')

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const { delta } = JSON.parse(raw) as { delta: string }
            setMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: next[next.length - 1].content + delta,
              }
              return next
            })
          } catch { /* JSON 파싱 실패 무시 */ }
        }
      }
      scrollToBottom()
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          role:    'assistant',
          content: '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          error:   true,
        }
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, scrollToBottom])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <>
      <Header title="AI 질의응답" />
      <main style={S.main}>
        {/* 채팅 영역 */}
        <div style={S.chatArea}>
          {messages.length === 0 ? (
            <div style={S.emptyState}>
              <span style={S.emptyIcon}>⚖️</span>
              <p style={S.emptyTitle}>부동산 법률 AI 어시스턴트</p>
              <p style={S.emptyDesc}>
                부동산 정책·법령·판례에 대해 질문하세요.<br />
                관련 법령을 검색해 근거와 함께 답변드립니다.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    style={{
                      background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 10, padding: '8px 14px',
                      fontSize: 13, color: '#0071e3', cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left' as const,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)
          )}
          {loading && messages[messages.length - 1]?.content === '' && (
            <div style={S.thinking}>답변을 생성하고 있습니다…</div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 법적 고지 */}
        <p style={S.notice}>
          본 AI 답변은 법률 조언이 아닌 참고용입니다. 중요한 결정은 전문가에게 확인하세요.
        </p>

        {/* 입력 바 */}
        <div style={S.inputBar}>
          <textarea
            style={S.input}
            placeholder="질문을 입력하세요. (Shift+Enter 줄바꿈)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            style={S.sendBtn(loading || !input.trim())}
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
          >
            전송
          </button>
        </div>
      </main>
    </>
  )
}
