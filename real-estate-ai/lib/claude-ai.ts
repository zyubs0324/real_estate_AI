/**
 * Anthropic Claude AI 클라이언트
 * 채팅·진단 의견 생성에 사용 (서버사이드 전용)
 *
 * 모델: claude-sonnet-4-5
 * 환경변수: ANTHROPIC_API_KEY
 *
 * 임베딩은 계속 lib/github-ai.ts (Cohere via GitHub Models) 사용
 */
import Anthropic from '@anthropic-ai/sdk'
import type { DiagnosisInput } from '@/lib/github-ai'

const MODEL = 'claude-sonnet-4-5'

function getClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
  })
}

// ─── 진단 리포트 AI 종합 의견 ────────────────────────────
export async function generateDiagnosisOpinionClaude(
  input: DiagnosisInput,
): Promise<string | null> {
  const { address, riskItems, buildingSummary, regulationSummary } = input

  const riskLines = riskItems.length > 0
    ? riskItems.map((r) =>
        `- ${r.label} (${r.level === 'danger' ? '위험' : r.level === 'warning' ? '주의' : '안전'})`
      ).join('\n')
    : '- 특이사항 없음'

  const userContent = [
    `주소: ${address}`,
    '',
    '【위험 항목】',
    riskLines,
    buildingSummary   ? `\n【건물 정보】\n${buildingSummary}`   : '',
    regulationSummary ? `\n【규제 정보】\n${regulationSummary}` : '',
  ].filter(Boolean).join('\n')

  try {
    const client = getClient()
    const message = await client.messages.create({
      model:      MODEL,
      max_tokens: 1024,
      system: `당신은 대한민국 공인중개사를 보조하는 부동산 진단 AI입니다.
주어진 매물 진단 결과를 바탕으로 실무적인 종합 의견을 한국어로 3~5문장 작성하세요.
위험 항목이 있으면 구체적인 주의사항을, 없으면 안전성을 설명하세요.
마지막에 "본 의견은 참고용이며 법적 효력이 없습니다." 문장을 추가하세요.`,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    return text || null
  } catch {
    return null
  }
}

// ─── 스트리밍 채팅 (SSE) ─────────────────────────────────
export async function streamChatClaude(
  systemPrompt: string,
  userMessage:  string,
): Promise<ReadableStream<Uint8Array>> {
  const client  = getClient()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.create({
          model:      MODEL,
          max_tokens: 2048,
          system:     systemPrompt,
          messages:   [{ role: 'user', content: userMessage }],
          stream:     true,
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const delta = event.delta.text
            if (delta) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
              )
            }
          }
        }
      } catch {
        // 오류 시 빈 스트림으로 종료
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })
}
