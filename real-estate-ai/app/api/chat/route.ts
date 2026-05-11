/**
 * POST /api/chat
 * RAG 기반 AI 질의응답 — SSE 스트리밍
 * U4-2 (Claude claude-sonnet-4-5로 교체)
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchDocuments, buildContext, buildSystemPrompt } from '@/lib/rag'
import { streamChatClaude } from '@/lib/claude-ai'

export async function POST(req: NextRequest) {
  const { question } = (await req.json()) as { question: string }

  if (!question?.trim()) {
    return NextResponse.json({ error: '질문을 입력하세요.' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  // 1. 관련 법령 문서 검색 (Cohere 임베딩 + pgvector)
  const chunks  = await searchDocuments(question, 5)
  const context = buildContext(chunks)
  const system  = buildSystemPrompt(context)

  // 2. Claude 스트리밍 응답
  const stream = await streamChatClaude(system, question)

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  })
}
