/**
 * POST /api/chat
 * RAG 기반 AI 질의응답 — SSE 스트리밍
 * U4-2
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchDocuments, buildContext, buildSystemPrompt } from '@/lib/rag'
import { streamChat } from '@/lib/github-ai'

export async function POST(req: NextRequest) {
  const { question } = (await req.json()) as { question: string }

  if (!question?.trim()) {
    return NextResponse.json({ error: '질문을 입력하세요.' }, { status: 400 })
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN이 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  // 1. 관련 문서 검색
  const chunks  = await searchDocuments(question, 5)
  const context = buildContext(chunks)
  const system  = buildSystemPrompt(context)

  // 2. gpt-4o 스트리밍 응답
  const stream = await streamChat([
    { role: 'system',  content: system   },
    { role: 'user',    content: question },
  ])

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  })
}
